import { NextResponse } from "next/server";
import { getProject, saveProject, updateProjectStatus } from "@/lib/projects/storage";
import { renderVideoWithFFmpeg } from "@/lib/video/ffmpeg";
import path from "node:path";
import fs from "node:fs";

export async function POST(request: Request) {
  console.log("[render-video] POST handler start");
  let projectId: string | undefined;

  try {
    const body = await request.json();
    projectId = body.projectId;

    console.log("[render-video] received:", { projectId });

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.plan.scenes.length) {
      return NextResponse.json(
        { error: "No scenes to render" },
        { status: 400 }
      );
    }

    updateProjectStatus(projectId, "rendering");

    const projectDir = path.join(process.cwd(), "tmp", projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    console.log("[render-video] project loaded:", {
      projectId,
      sceneCount: project.plan.scenes.length,
      projectDir,
    });

    const sceneFiles: string[] = [];
    const audioFiles: string[] = [];

    for (let i = 0; i < project.plan.scenes.length; i++) {
      const scene = project.plan.scenes[i];
      const sceneDir = path.join(projectDir, `scene-${i + 1}`);
      const videoFile = path.join(sceneDir, "scene.mp4");

      if (fs.existsSync(videoFile)) {
        const stats = fs.statSync(videoFile);
        sceneFiles.push(videoFile);
        console.log(`[render] scene ${i + 1}: path=${videoFile} size=${stats.size}`);
      } else {
        console.warn(`[render] scene ${i + 1}: video file not found at ${videoFile}`);
      }

      if (scene.audioPath && fs.existsSync(scene.audioPath)) {
        const stats = fs.statSync(scene.audioPath);
        audioFiles.push(scene.audioPath);
        console.log(`[render] audio scene ${i + 1}: path=${scene.audioPath} size=${stats.size}`);
      }
    }

    console.log("[render] scene files found:", sceneFiles.length);
    console.log("[render] audio files found:", audioFiles.length);

    if (!sceneFiles.length) {
      throw new Error("No scene video files found to render");
    }

    console.log("[render] starting ffmpeg render");
    const startTime = Date.now();

    const result = await renderVideoWithFFmpeg({
      projectDir,
      scenes: project.plan.scenes,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[render] ffmpeg completed in ${elapsed}ms`);

    const outputStats = fs.statSync(result.outputPath);
    console.log("[render] output verified:", {
      path: result.outputPath,
      size: outputStats.size,
    });

    project.videoPath = result.outputPath;
    project.videoUrl = `/api/video/${projectId}`;
    project.status = "completed";
    saveProject(project);

    const savedProject = getProject(projectId);
    console.log("[render] verified saved project:", { videoPath: savedProject?.videoPath, status: savedProject?.status });

    console.log("[render] returning response");
    return NextResponse.json({
      success: true,
      outputPath: result.outputPath,
      size: outputStats.size,
      duration: result.duration,
      videoUrl: `/api/video/${projectId}`,
      project: savedProject,
    });
  } catch (error) {
    console.error("[render-video] fatal error:", error);
    const message = error instanceof Error ? error.message : "Rendering failed";

    if (projectId) {
      updateProjectStatus(projectId, "error", message);
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
