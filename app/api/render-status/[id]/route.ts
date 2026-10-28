import { NextResponse } from "next/server";
import { getServerProject } from "@/lib/projects/server-store";
import { isRenderActive } from "@/lib/video/render-job";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getServerProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({
    projectId: id,
    status: project.status,
    error: project.error,
    videoUrl: project.videoUrl,
    active: isRenderActive(id),
  });
}
