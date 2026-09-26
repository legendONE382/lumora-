import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects/storage";
import { getServerProject } from "@/lib/projects/server-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let project = getProject(id);
    
    if (!project) {
      project = getServerProject(id);
    }
    
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}
