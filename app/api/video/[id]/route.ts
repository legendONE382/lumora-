import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects/storage";
import path from "node:path";
import fs from "node:fs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getProject(id);

    if (!project || !project.videoPath) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const videoPath = path.isAbsolute(project.videoPath)
      ? project.videoPath
      : path.join(process.cwd(), project.videoPath);
    
    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found on disk" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(videoPath);
    const fileBuffer = fs.readFileSync(videoPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("[video] error serving video:", error);
    return NextResponse.json(
      { error: "Failed to serve video" },
      { status: 500 }
    );
  }
}
