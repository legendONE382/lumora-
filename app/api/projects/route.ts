import { NextResponse } from "next/server";
import { getAllServerProjects } from "@/lib/projects/server-store";

export async function GET() {
  try {
    const projects = getAllServerProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[projects] failed to list:", error);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 }
    );
  }
}
