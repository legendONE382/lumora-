import { NextResponse } from "next/server";
import { generateNarration } from "@/lib/audio/piper";
import { getProject, saveProject } from "@/lib/projects/storage";
import path from "node:path";
import fs from "node:fs";

export async function POST(request: Request) {
  console.log("[generate-audio] handler start");
  try {
    const body = await request.json();
    const { projectId, plan } = body;

    console.log("[generate-audio] received:", { projectId, sceneCount: plan?.scenes?.length });

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

    const audioDataUrls: { sceneId: string; dataUrl: string | undefined; path?: string }[] = [];

    for (const scene of plan.scenes) {
      try {
        console.log(`[generate-audio] generating TTS for scene ${scene.id}`);
        const result = await generateNarration(scene.narration, projectDir);
        
        const arrayBuffer = fs.readFileSync(result.wavPath);
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:audio/wav;base64,${base64}`;
        audioDataUrls.push({ sceneId: scene.id, dataUrl, path: result.wavPath });
        console.log(`[generate-audio] TTS done for scene ${scene.id}, file: ${result.wavPath}`);
      } catch (err) {
        console.error(`[generate-audio] TTS failed for scene ${scene.id}:`, err);
        audioDataUrls.push({ sceneId: scene.id, dataUrl: undefined });
      }
    }

    project.plan.scenes = project.plan.scenes.map((scene) => {
      const audioData = audioDataUrls.find((a) => a.sceneId === scene.id);
      return {
        ...scene,
        audioUrl: audioData?.dataUrl,
        audioPath: audioData?.path,
      };
    });

    saveProject(project);

    console.log("[generate-audio] done");
    return NextResponse.json({ audioDataUrls });
  } catch (error) {
    console.error("[generate-audio] fatal error:", error);
    const message = error instanceof Error ? error.message : "Audio generation failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
