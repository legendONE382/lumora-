import { NextResponse } from "next/server";
import { searchPexelsPhotos, searchPexelsVideos, selectBestPhoto, selectBestVideo, downloadPexelsFile, PexelsPhoto, PexelsVideo } from "@/lib/media/pexels";
import { getProject, saveProject } from "@/lib/projects/storage";
import path from "node:path";
import fs from "node:fs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, plan } = body;

    console.log("[generate-visual] received:", { projectId, sceneCount: plan?.scenes?.length });

    if (!projectId || !plan) {
      return NextResponse.json(
        { error: "projectId and plan are required" },
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

    const projectDir = path.join(process.cwd(), "tmp", projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const scenes = await Promise.all(
      plan.scenes.map(async (scene: any, index: number) => {
        try {
          console.log(`[generate-visual] searching media for scene ${index + 1}/${plan.scenes.length}`);
          const query = scene.searchQueries?.length ? scene.searchQueries[0] : scene.visualDescription || scene.onScreenText || "cinematic";
          
          const [photos, videos] = await Promise.all([
            searchPexelsPhotos(query, 10).catch(() => [] as any[]),
            searchPexelsVideos(query, 10).catch(() => [] as any[]),
          ]);

          const bestVideo = selectBestVideo(videos, query);
          const bestPhoto = selectBestPhoto(photos, query);
          const selected = bestVideo || bestPhoto;

          if (!selected) {
            console.warn(`[generate-visual] no media found for scene ${index + 1}`);
            return { ...scene, imageUrl: "", videoUrl: "", source: null };
          }

          const sceneDir = path.join(projectDir, `scene-${index + 1}`);
          fs.mkdirSync(sceneDir, { recursive: true });

          const isVideo = "video_files" in selected;
          let localPath = "";
          let source: any = null;

          if (isVideo) {
            const video = selected as PexelsVideo;
            const bestFile = video.video_files.reduce((best, file) => {
              const score = (file.width >= 1080 ? 10 : 0) + (file.height >= 1920 ? 10 : 0) - Math.abs(file.width - 1080) - Math.abs(file.height - 1920);
              return score > (best?.score || 0) ? { ...file, score } : best;
            }, null as any);

            if (bestFile) {
              localPath = path.join(sceneDir, "scene.mp4");
              await downloadPexelsFile(bestFile.link, localPath);
              console.log(`[generate-visual] downloaded video for scene ${index + 1}:`, bestFile.link.substring(0, 60));
            }
            source = { type: "video", photographer: video.user?.name, url: video.url };
          } else {
            const photo = selected as PexelsPhoto;
            const bestSrc = photo.src.medium || photo.src.large || photo.src.original;
            localPath = path.join(sceneDir, "scene.jpg");
            await downloadPexelsFile(bestSrc, localPath);
            console.log(`[generate-visual] downloaded photo for scene ${index + 1}:`, bestSrc.substring(0, 60));
            source = { type: "photo", photographer: photo.photographer, url: photo.url };
          }

          return {
            ...scene,
            imageUrl: localPath,
            videoUrl: isVideo ? localPath : "",
            source,
          };
        } catch (err) {
          console.error(`[generate-visual] scene ${index} failed:`, err);
          return { ...scene, imageUrl: "", videoUrl: "", source: null };
        }
      })
    );

    console.log("[generate-visual] saving project...");
    project.plan.scenes = scenes;
    saveProject(project);
    console.log("[generate-visual] saved");

    const response = { scenes, count: scenes.length };
    console.log("[generate-visual] returning response, size:", JSON.stringify(response).length);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[generate-visual] fatal error:", error);
    const message = error instanceof Error ? error.message : "Visual generation failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
