import { NextResponse } from "next/server";
import { getServerProject, updateServerProjectStatus } from "@/lib/projects/server-store";
import { isRenderActive, runRenderJob } from "@/lib/video/render-job";
import path from "node:path";
import fs from "node:fs";
import { DATA_DIR } from "@/lib/projects/server-store";

export const maxDuration = 60;

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

    const project = getServerProject(projectId);
    if (!project) {
      console.warn("[render-video] project not found:", projectId);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.plan?.scenes?.length) {
      return NextResponse.json(
        { error: "No scenes to render" },
        { status: 400 }
      );
    }

    // Prevent duplicate jobs
    if (isRenderActive(projectId)) {
      console.log("[render-video] job already running for", projectId);
      return NextResponse.json(
        { status: "rendering", message: "Render already in progress" },
        { status: 202 }
      );
    }

    // Stale state: if persisted as rendering but no active job, allow re-trigger
    if (project.status === "rendering") {
      console.warn("[render-video] stale rendering state detected, re-triggering:", projectId);
    }

    const projectDir = path.join(DATA_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    updateServerProjectStatus(projectId, "rendering");

    // Fire and forget - do NOT await
    void runRenderJob(projectId).catch((err) => {
      console.error("[render-video] background job unhandled error:", err);
    });

    console.log("[render-video] accepted, background job started for", projectId);
    return NextResponse.json(
      { status: "rendering", projectId, message: "Render started" },
      { status: 202 }
    );
  } catch (error) {
    console.error("[render-video] fatal error:", error);
    const message = error instanceof Error ? error.message : "Rendering failed";
    if (projectId) {
      updateServerProjectStatus(projectId, "error", message);
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("id");
  if (!projectId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const project = getServerProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({
    projectId,
    status: project.status,
    error: project.error,
    videoUrl: project.videoUrl,
    videoPath: project.videoPath,
  });
}
