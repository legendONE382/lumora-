"use client";

import { Scene } from "@/types";

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function renderVideoWithCanvas(
  scenes: Scene[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas context not available"));

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;
    const fps = 30;
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    const totalFrames = totalDuration * fps;

    let currentScene = 0;
    let sceneTime = 0;
    let frameCount = 0;
    let mediaRecorder: MediaRecorder | undefined;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      if (currentScene >= scenes.length) {
        mediaRecorder?.stop();
        return;
      }

      const delta = now - lastTime;
      lastTime = now;

      const scene = scenes[currentScene];
      const img = images[currentScene];

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (img && img.complete && img.naturalWidth > 0) {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }

      if (scene.onScreenText) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 1800, 1080, 120);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(scene.onScreenText, 540, 1860);
      }

      sceneTime += delta / 1000;
      frameCount++;
      onProgress?.(frameCount / totalFrames);

      if (sceneTime >= scene.duration) {
        currentScene++;
        sceneTime = 0;
      }

      requestAnimationFrame(drawFrame);
    };

    const startRecording = async () => {
      const canvasStream = canvas.captureStream(fps);

      let combinedStream: MediaStream;
      const hasAudio = scenes.some((s) => s.audioUrl);
      let audioContext: AudioContext | undefined;

      if (hasAudio) {
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        try {
          const audioBuffers = await Promise.all(
            scenes.map(async (scene) => {
              if (!scene.audioUrl) return null;
              const base64 = scene.audioUrl.replace(/^data:audio\/[^;]+;base64,/, "");
              const arrayBuffer = base64ToArrayBuffer(base64);
              return await audioContext!.decodeAudioData(arrayBuffer.slice(0));
            })
          );

          let currentTime = 0;
          for (let i = 0; i < scenes.length; i++) {
            const buffer = audioBuffers[i];
            if (!buffer) continue;
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(destination);
            source.start(currentTime);
            currentTime += scenes[i].duration;
          }
        } catch (error) {
          console.error("[renderer] audio setup failed:", error);
        }

        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);
      } else {
        combinedStream = canvasStream;
      }

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType, videoBitsPerSecond: 5000000 } : { videoBitsPerSecond: 5000000 };

      mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioContext) {
          audioContext.close().catch(() => {});
        }
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        if (audioContext) {
          audioContext.close().catch(() => {});
        }
        reject(new Error("MediaRecorder error: " + (event as any).error?.message || "Unknown recording error"));
      };

      mediaRecorder.start();
      lastTime = performance.now();
      requestAnimationFrame(drawFrame);
    };

    const tryLoadImage = (scene: Scene, index: number) => {
      return new Promise<void>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          images[index] = img;
          loadedCount++;
          if (loadedCount === scenes.length) {
            resolve();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === scenes.length) {
            resolve();
          }
        };
        img.src = scene.imageUrl || "";
      });
    };

    Promise.all(scenes.map((scene, index) => tryLoadImage(scene, index)))
      .then(() => startRecording())
      .catch((error) => reject(error));
  });
}
