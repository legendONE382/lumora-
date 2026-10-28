import { NextResponse } from "next/server";
import { getServerProject, DATA_DIR } from "@/lib/projects/server-store";
import path from "node:path";
import fs from "node:fs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getServerProject(id);

    let videoPath: string | undefined;
    if (project?.videoPath) {
      videoPath = path.isAbsolute(project.videoPath)
        ? project.videoPath
        : path.join(process.cwd(), project.videoPath);
    } else {
      videoPath = path.join(DATA_DIR, id, "final.mp4");
    }

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found on disk" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(videoPath);
    const range = request.headers.get("range");

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : stats.size - 1;
        const chunkSize = end - start + 1;
        const stream = fs.createReadStream(videoPath, { start, end });
        return new NextResponse(stream as any, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${stats.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize.toString(),
            "Content-Type": "video/mp4",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    const stream = fs.createReadStream(videoPath);
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stats.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
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
