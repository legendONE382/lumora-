import { Scene } from "@/types";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { generateSrt, getSubtitlePath } from "./subtitles";

const FFMPEG_BINARY = process.env.FFMPEG_BINARY || "ffmpeg";
const MUSIC_ROOT = path.join(process.cwd(), "music");

export interface RenderOptions {
  projectDir: string;
  scenes: Scene[];
  width?: number;
  height?: number;
  fps?: number;
  subtitles?: boolean;
  musicPath?: string;
}

export interface RenderResult {
  outputPath: string;
  duration: number;
}

export function selectMusicPath(tone: string): string | null {
  const normalized = (tone || "").toLowerCase();
  let moodFolder = "cinematic";

  if (/\bluxury\b|\bpremium\b|\belegant\b/.test(normalized)) {
    moodFolder = "luxury";
  } else if (/\bcinematic\b|\bepic\b|\batmospheric\b/.test(normalized)) {
    moodFolder = "cinematic";
  } else if (/\bdramatic\b|\bemotional\b|\bintense\b/.test(normalized)) {
    moodFolder = "dramatic";
  } else if (/\benergetic\b|\bupbeat\b|\bexciting\b/.test(normalized)) {
    moodFolder = "energetic";
  } else if (/\bprofessional\b|\bbusiness\b|\bcorporate\b/.test(normalized)) {
    moodFolder = "corporate";
  }

  const moodDir = path.join(MUSIC_ROOT, moodFolder);
  if (!fs.existsSync(moodDir)) {
    console.warn("[music] mood folder not found:", moodDir);
    return null;
  }

  const files = fs
    .readdirSync(moodDir)
    .filter((f) => /\.(mp3|wav|aac|m4a|flac)$/i.test(f))
    .map((f) => path.join(moodDir, f));

  if (!files.length) {
    console.warn("[music] no audio files in:", moodDir);
    return null;
  }

  const index = Math.floor(Math.random() * files.length);
  console.log("[music] selected folder:", moodFolder, "file:", path.basename(files[index]));
  return files[index];
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
  audioPath?: string,
  videoFileOverride?: string,
  imageFileOverride?: string
): Promise<void> {
  const videoFile = videoFileOverride || getVideoFileForScene(sceneDir);
  const imageFile = imageFileOverride || getImageFileForScene(sceneDir);

  if (!videoFile && !imageFile) {
    const args = [
      "-f", "lavfi",
      "-i", `color=c=black:s=${width}x${height}:d=${duration}:r=${fps}`,
      "-f", "lavfi",
      "-i", `anullsrc=r=48000:cl=mono`,
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "48000",
      "-shortest",
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

    if (hasAudio && audioPath && fs.existsSync(audioPath)) {
      args.push(
        "-map", "0:v",
        "-map", "1:a",
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}`,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000"
      );
    } else {
      args.push(
        "-f", "lavfi",
        "-i", `anullsrc=r=48000:cl=mono`,
        "-map", "0:v",
        "-map", "1:a",
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}`,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-shortest"
      );
    }

    args.push("-y", outputPath);
    await runFFmpeg(args);
    return;
  }

  if (imageFile) {
    const args: string[] = [
      "-loop", "1",
      "-i", imageFile,
      "-f", "lavfi",
      "-i", `anullsrc=r=48000:cl=mono`,
      "-map", "0:v",
      "-map", "1:a",
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},format=yuv420p,zoompan=z='1+0.08*if(gt(t,${duration}),1,t/${duration})':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=${width}x${height}:fps=${fps}`,
      "-t", String(duration),
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "48000",
      "-shortest",
      "-y",
      outputPath,
    ];
    await runFFmpeg(args);
    return;
  }
}

export async function renderVideoWithFFmpeg(options: RenderOptions): Promise<RenderResult> {
  const { projectDir, scenes, width = 1080, height = 1920, fps = 30, subtitles = true, musicPath } = options;
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
    const sceneIndex = (scene as any)._sceneIndex || i + 1;
    const sceneDir = path.join(projectDir, `scene-${sceneIndex}`);
    const clipPath = path.join(clipsDir, `clip-${i + 1}.mp4`);

    const audioPath = scene.audioPath && fs.existsSync(scene.audioPath) ? scene.audioPath : undefined;

    await renderSceneClip(
      sceneDir,
      clipPath,
      scene.duration,
      width,
      height,
      fps,
      !!audioPath,
      audioPath,
      (scene as any)._videoFile,
      (scene as any)._imageFile
    );
    clipPaths.push(clipPath);
    console.log(`[ffmpeg] scene ${i + 1} rendered`);
  }

  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
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

  const buildMusicFilter = (musicInputIndex: number, duration: number): string => {
    const escaped = musicPath!.replace(/\\/g, "/");
    return `[${musicInputIndex}:a]aloop=loop=-1:size=2e9,atrim=0:${duration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, duration - 3)}:d=3,volume=0.3[bg]`;
  };

  if (musicPath && fs.existsSync(musicPath)) {
    args.push("-i", musicPath);
    const musicInputIndex = clipPaths.length;
    const musicFilter = buildMusicFilter(musicInputIndex, totalDuration);

    if (subtitles) {
      try {
        const subtitlePath = getSubtitlePath(projectDir);
        generateSrt(scenes, subtitlePath);
        console.log("[render] burning subtitles into final video");
        const relativeSubPath = path.relative(process.cwd(), subtitlePath).replace(/\\/g, "/");
        const subtitleFilter = `subtitles=${relativeSubPath}:force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=0,Alignment=2,MarginV=30'`;
        
        args.push(
          "-filter_complex", `${concatFilter};${musicFilter};[outv]${subtitleFilter}[outv_sub];[outa][bg]amix=inputs=2:duration=first:normalize=0[mixed]`,
          "-map", "[outv_sub]",
          "-map", "[mixed]",
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
      } catch (error) {
        console.error("[render] subtitle generation failed:", error);
        args.push(
          "-filter_complex", `${concatFilter};${musicFilter};[outa][bg]amix=inputs=2:duration=first:normalize=0[mixed]`,
          "-map", "[outv]",
          "-map", "[mixed]",
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
      }
    } else {
      args.push(
        "-filter_complex", `${concatFilter};${musicFilter};[outa][bg]amix=inputs=2:duration=first:normalize=0[mixed]`,
        "-map", "[outv]",
        "-map", "[mixed]",
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
    }
  } else if (subtitles) {
    try {
      const subtitlePath = getSubtitlePath(projectDir);
      generateSrt(scenes, subtitlePath);
      console.log("[render] burning subtitles into final video");
      const relativeSubPath = path.relative(process.cwd(), subtitlePath).replace(/\\/g, "/");
      const subtitleFilter = `subtitles=${relativeSubPath}:force_style='FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Shadow=0,Alignment=2,MarginV=30'`;
      
      args.push(
        "-filter_complex", `${concatFilter};[outv]${subtitleFilter}[outv_sub]`,
        "-map", "[outv_sub]",
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
    } catch (error) {
      console.error("[render] subtitle generation failed:", error);
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
    }
  } else {
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
  }

  console.log("[ffmpeg] concatenating scenes");
  await runFFmpeg(args);

  const stats = fs.statSync(outputPath);
  console.log("[ffmpeg] output created:", outputPath, "size:", stats.size);
  return { outputPath, duration: stats.size };
}
