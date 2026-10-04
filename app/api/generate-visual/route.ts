import { NextResponse } from "next/server";
import { searchPexelsPhotos, searchPexelsVideos, selectBestPhoto, selectBestVideo, downloadPexelsFile, PexelsPhoto, PexelsVideo } from "@/lib/media/pexels";
import { getProject, saveProject } from "@/lib/projects/storage";
import { saveServerProject } from "@/lib/projects/server-store";
import path from "node:path";
import fs from "node:fs";

const QUERY_CACHE = new Map<string, { photos: PexelsPhoto[]; videos: PexelsVideo[] }>();

async function cachedPexelsSearch(query: string): Promise<{ photos: PexelsPhoto[]; videos: PexelsVideo[] }> {
  const trimmed = query.trim();
  if (QUERY_CACHE.has(trimmed)) {
    return QUERY_CACHE.get(trimmed)!;
  }

  const [photos, videos] = await Promise.all([
    searchPexelsPhotos(trimmed, 10).catch(() => [] as PexelsPhoto[]),
    searchPexelsVideos(trimmed, 10).catch(() => [] as PexelsVideo[]),
  ]);

  const result = { photos, videos };
  QUERY_CACHE.set(trimmed, result);
  return result;
}

function buildSceneQueries(scene: any): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  const add = (q: string | undefined) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;
    if (seen.has(trimmed.toLowerCase())) return;
    seen.add(trimmed.toLowerCase());
    queries.push(trimmed);
  };

  (scene.searchQueries || []).forEach((q: string) => add(q));
  add(scene.visualDescription);
  add(scene.onScreenText);

  return queries.slice(0, 3);
}

async function resolveSceneMedia(queries: string[]): Promise<{ photo: PexelsPhoto | null; video: PexelsVideo | null }> {
  const searchResults = await Promise.all(
    queries.map((q) => cachedPexelsSearch(q))
  );

  let bestPhoto: PexelsPhoto | null = null;
  let bestVideo: PexelsVideo | null = null;
  let bestPhotoScore = -1;
  let bestVideoScore = -1;

  for (const { photos, videos } of searchResults) {
    for (const photo of photos) {
      const score = (photo.width * photo.height) + (photo.width >= 1080 ? 10000 : 0);
      if (score > bestPhotoScore) {
        bestPhotoScore = score;
        bestPhoto = photo;
      }
    }
    for (const video of videos) {
      const score = (video.width * video.height) + (video.duration >= 5 && video.duration <= 30 ? 5000 : 0);
      if (score > bestVideoScore) {
        bestVideoScore = score;
        bestVideo = video;
      }
    }
  }

  return { photo: bestPhoto, video: bestVideo };
}

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

    const fallbackAssets: { imageUrl?: string; videoUrl?: string; source?: any }[] = [];

    const scenes = await Promise.all(
      plan.scenes.map(async (scene: any, index: number) => {
        try {
          console.log(`[generate-visual] searching media for scene ${index + 1}/${plan.scenes.length}`);
          const queries = buildSceneQueries(scene);
          console.log(`[generate-visual] scene ${index + 1} queries:`, queries);

          const { photo, video } = await resolveSceneMedia(queries);
          const selected = video || photo;

          if (selected) {
            const sceneDir = path.join(projectDir, `scene-${index + 1}`);
            fs.mkdirSync(sceneDir, { recursive: true });

            const isVideo = "video_files" in selected;
            let localPath = "";
            let source: any = null;

            if (isVideo) {
              const v = selected as PexelsVideo;
              const bestFile = v.video_files.reduce((best, file) => {
                const score = (file.width >= 1080 ? 10 : 0) + (file.height >= 1920 ? 10 : 0) - Math.abs(file.width - 1080) - Math.abs(file.height - 1920);
                return score > (best?.score || 0) ? { ...file, score } : best;
              }, null as any);

              if (bestFile) {
                localPath = path.join(sceneDir, "scene.mp4");
                await downloadPexelsFile(bestFile.link, localPath);
                console.log(`[generate-visual] downloaded video for scene ${index + 1}:`, bestFile.link.substring(0, 60));
              }
              source = { type: "video", photographer: v.user?.name, url: v.url };
            } else {
              const p = selected as PexelsPhoto;
              const bestSrc = p.src.medium || p.src.large || p.src.original;
              localPath = path.join(sceneDir, "scene.jpg");
              await downloadPexelsFile(bestSrc, localPath);
              console.log(`[generate-visual] downloaded photo for scene ${index + 1}:`, bestSrc.substring(0, 60));
              source = { type: "photo", photographer: p.photographer, url: p.url };
            }

            const result = {
              ...scene,
              imageUrl: localPath,
              videoUrl: isVideo ? localPath : "",
              source,
            };
            fallbackAssets.push({ imageUrl: localPath, videoUrl: isVideo ? localPath : "", source });
            return result;
          }

          console.warn(`[generate-visual] no media found for scene ${index + 1} after ${queries.length} queries`);
          return { ...scene, imageUrl: "", videoUrl: "", source: null };
        } catch (err) {
          console.error(`[generate-visual] scene ${index} failed:`, err);
          return { ...scene, imageUrl: "", videoUrl: "", source: null };
        }
      })
    );

    const unresolved = scenes.filter((s) => !s.imageUrl && !s.videoUrl);
    for (const scene of unresolved) {
      const sceneIndex = plan.scenes.findIndex((s: any) => s.id === scene.id);
      if (sceneIndex < 0) continue;

      if (fallbackAssets.length > 0) {
        const reused = fallbackAssets[0];
        const sceneDir = path.join(projectDir, `scene-${sceneIndex + 1}`);
        fs.mkdirSync(sceneDir, { recursive: true });

        const ext = reused.videoUrl ? ".mp4" : ".jpg";
        const destPath = path.join(sceneDir, `scene${ext}`);
        await fs.promises.copyFile(reused.videoUrl || reused.imageUrl!, destPath);

        const isVideo = !!reused.videoUrl;
        console.warn(`[generate-visual] scene ${sceneIndex + 1} reused ${isVideo ? "video" : "photo"} from another scene`);
        
        scene.imageUrl = destPath;
        scene.videoUrl = isVideo ? destPath : "";
        scene.source = { ...reused.source, reused: true };
      }
    }

    console.log("[generate-visual] saving project...");
    project.plan.scenes = scenes;
    saveProject(project);
    saveServerProject(project);
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
