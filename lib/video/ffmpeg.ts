import { Scene } from "@/types";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const FFMPEG_BINARY = process.env.FFMPEG_BINARY || "ffmpeg";

export interface RenderOptions {
  projectDir: string;
  scenes: Scene[];
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
}

function getVideoFileForScene(sceneDir: string): string | null {
  const candidates = [
    path.join(sceneDir, "scene.mp4"),
    path.join(sceneDir, "scene.mov"),
    path.join(sceneDir, "scene.mkv"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getImageFileForScene(sceneDir: string): string | null {
  const candidates = [
    path.join(sceneDir, "scene.jpg"),
    path.join(sceneDir, "scene.jpeg"),
    path.join(sceneDir, "scene.png"),
    path.join(sceneDir, "scene.webp"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[ffmpeg] running:", FFMPEG_BINARY, args.join(" "));
    const child = spawn(FFMPEG_BINARY, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (error) => {
      console.error("[ffmpeg] spawn error:", error);
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("[ffmpeg] exit code:", code);
        console.error("[ffmpeg] stderr:", stderr.split("\n").slice(-20).join("\n"));
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.split("\n").slice(-5).join("\n")}`));
      } else {
        console.log("[ffmpeg] completed successfully");
        resolve();
      }
    });
  });
}

async function renderSceneClip(
  sceneDir: string,
  outputPath: string,
  duration: number,
  width: number,
  height: number,
  fps: number,
  hasAudio: boolean,
  audioPath?: string
): Promise<void> {
  const videoFile = getVideoFileForScene(sceneDir);
  const imageFile = getVideoFileForScene(sceneDir) || getImageFileForScene(sceneDir);

  if (!videoFile && !imageFile) {
    const args = [
      "-f", "lavfi",
      "-i", `color=c=black:s=${width}x${height}:d=${duration}:r=${fps}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-an",
      "-y",
      outputPath,
    ];
    await runFFmpeg(args);
    return;
  }

  if (videoFile) {
    const args: string[] = [
      "-ss", "0",
      "-t", String(duration),
    ];

    if (hasAudio && audioPath && fs.existsSync(audioPath)) {
      args.push("-i", videoFile, "-i", audioPath);
    } else {
      args.push("-i", videoFile);
    }

    args.push(
      "-map", "0:v",
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p"
    );

    if (hasAudio && audioPath && fs.existsSync(audioPath)) {
      args.push("-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-ar", "48000");
    } else {
      args.push("-an");
    }

    args.push("-y", outputPath);
    await runFFmpeg(args);
    return;
  }

  if (imageFile) {
    const args: string[] = [
      "-loop", "1",
      "-i", imageFile,
    ];

    args.push(
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},format=yuv420p,zoompan=z='1+0.08*min(t/${duration},1)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=${width}x${height}:fps=${fps}`,
      "-t", String(duration),
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-an",
      "-y",
      outputPath,
    );
    await runFFmpeg(args);
    return;
  }
}

export async function renderVideoWithFFmpeg(options: RenderOptions): Promise<RenderResult> {
  const { projectDir, scenes, width = 1080, height = 1920, fps = 30 } = options;
  const outputPath = path.join(projectDir, "final.mp4");

  if (!scenes.length) {
    throw new Error("No scenes to render");
  }

  const clipsDir = path.join(projectDir, "clips");
  fs.mkdirSync(clipsDir, { recursive: true });

  console.log("[ffmpeg] rendering", scenes.length, "scenes");
  const clipPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneDir = path.join(projectDir, `scene-${i + 1}`);
    const clipPath = path.join(clipsDir, `clip-${i + 1}.mp4`);

    const audioPath = scene.audioPath && fs.existsSync(scene.audioPath) ? scene.audioPath : undefined;

    await renderSceneClip(sceneDir, clipPath, scene.duration, width, height, fps, !!audioPath, audioPath);
    clipPaths.push(clipPath);
    console.log(`[ffmpeg] scene ${i + 1} rendered`);
  }

  const concatFilter = clipPaths
    .map((_, i) => `[${i}:v][${i}:a]`)
    .join("") +
    `concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`;

  const args: string[] = [
    "-y",
  ];

  clipPaths.forEach((clip) => {
    args.push("-i", clip);
  });

  args.push(
    "-filter_complex", concatFilter,
    "-map", "[outv]",
    "-map", "[outa]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-movflags", "+faststart",
    outputPath
  );

  console.log("[ffmpeg] concatenating scenes");
  await runFFmpeg(args);

  const stats = fs.statSync(outputPath);
  console.log("[ffmpeg] output created:", outputPath, "size:", stats.size);
  return { outputPath, duration: stats.size };
}
