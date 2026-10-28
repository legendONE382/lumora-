import { NextResponse } from "next/server";
import { getServerProject } from "@/lib/projects/server-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getServerProject(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("[projects] failed to get project:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}
