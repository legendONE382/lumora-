import { getServerProject, saveServerProject, updateServerProjectStatus, DATA_DIR } from "@/lib/projects/server-store";
import { renderVideoWithFFmpeg, selectMusicPath } from "@/lib/video/ffmpeg";
import path from "node:path";
import fs from "node:fs";

const activeJobs = new Set<string>();

export function isRenderActive(projectId: string): boolean {
  return activeJobs.has(projectId);
}

function getImageFileForScene(sceneDir: string): string | null {
  const candidates = [
    path.join(sceneDir, "scene.jpg"),
    path.join(sceneDir, "scene.jpeg"),
    path.join(sceneDir, "scene.png"),
    path.join(sceneDir, "scene.webp"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function runRenderJob(projectId: string): Promise<void> {
  if (activeJobs.has(projectId)) {
    console.log("[render-job] already running for", projectId);
    return;
  }
  activeJobs.add(projectId);
  console.log("[render-job] started for", projectId);

  try {
    const project = getServerProject(projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    if (!project.plan?.scenes?.length) {
      throw new Error("No scenes to render");
    }

    updateServerProjectStatus(projectId, "rendering");
    console.log("[render-job] status set to rendering for", projectId);

    const projectDir = path.join(DATA_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const validScenes: any[] = [];
    for (let i = 0; i < project.plan.scenes.length; i++) {
      const scene = project.plan.scenes[i];
      const sceneDir = path.join(projectDir, `scene-${i + 1}`);
      const videoFile = path.join(sceneDir, "scene.mp4");
      const imageFile = getImageFileForScene(sceneDir);

      const hasVideo = fs.existsSync(videoFile);
      const hasImage = !!imageFile;

      if (hasVideo || hasImage) {
        validScenes.push({
          ...scene,
          _sceneIndex: i + 1,
          _videoFile: hasVideo ? videoFile : undefined,
          _imageFile: imageFile || undefined,
        });
        console.log(`[render-job] scene ${i + 1}: valid (video=${hasVideo}, image=${hasImage})`);
      } else {
        console.warn(`[render-job] scene ${i + 1}: missing media, skipping`);
      }

      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        console.log(`[render-job] audio scene ${i + 1}: path=${scene.audioPath}`);
      } else {
        console.warn(`[render-job] audio scene ${i + 1}: not found`);
      }
    }

    if (!validScenes.length) {
      throw new Error("No scene media files found to render");
    }

    console.log("[render-job] starting ffmpeg render for", projectId, "scenes=", validScenes.length);
    const startTime = Date.now();

    const musicPath = selectMusicPath(project.plan.tone) || undefined;
    console.log("[render-job] music:", musicPath || "none");

    const result = await renderVideoWithFFmpeg({
      projectDir,
      scenes: validScenes,
      musicPath,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[render-job] ffmpeg completed in ${elapsed}ms`);

    const outputStats = fs.statSync(result.outputPath);
    if (!outputStats || outputStats.size <= 0) {
      throw new Error("Rendered MP4 is empty or missing");
    }
    console.log("[render-job] output verified:", { path: result.outputPath, size: outputStats.size });

    const latest = getServerProject(projectId) || project;
    latest.videoPath = result.outputPath;
    latest.videoUrl = `/api/video/${projectId}`;
    latest.status = "completed";
    latest.error = undefined;
    saveServerProject(latest);

    console.log("[render-job] completed for", projectId, "videoUrl=", latest.videoUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rendering failed";
    console.error("[render-job] failed for", projectId, ":", message);
    updateServerProjectStatus(projectId, "error", message);
  } finally {
    activeJobs.delete(projectId);
    console.log("[render-job] released lock for", projectId);
  }
}
