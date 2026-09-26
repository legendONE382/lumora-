import { NextResponse } from "next/server";
import { getProject, saveProject } from "@/lib/projects/storage";
import { saveServerProject } from "@/lib/projects/server-store";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const projectDir = path.join(process.cwd(), "tmp", projectId);
    const project = {
      id: projectId,
      title: "Mercedes-Benz Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "rendering",
      plan: {
        title: "Mercedes-Benz Test",
        goal: "Showcase Mercedes-Benz luxury and performance",
        audience: "Luxury car enthusiasts",
        tone: "Premium, cinematic",
        visualStyle: "cinematic",
        duration: 60,
        aspectRatio: "9:16" as const,
        concept: "A cinematic journey through Mercedes-Benz innovation",
        script: "Discover the artistry of Mercedes-Benz...",
        scenes: [
          { id: "1", duration: 8.55, narration: "Scene 1", visualDescription: "Mercedes-Benz on road", onScreenText: "Luxury", audioPath: path.join(projectDir, "narration-1789468672125.wav") },
          { id: "2", duration: 14.5, narration: "Scene 2", visualDescription: "Interior details", onScreenText: "Craftsmanship", audioPath: path.join(projectDir, "narration-1789468695923.wav") },
          { id: "3", duration: 23.42, narration: "Scene 3", visualDescription: "Performance driving", onScreenText: "Power", audioPath: path.join(projectDir, "narration-1789468717957.wav") },
          { id: "4", duration: 5.17, narration: "Scene 4", visualDescription: "Technology features", onScreenText: "Innovation", audioPath: path.join(projectDir, "narration-1789468736242.wav") },
          { id: "5", duration: 8.98, narration: "Scene 5", visualDescription: "Brand heritage", onScreenText: "Legacy", audioPath: path.join(projectDir, "narration-1789468756393.wav") },
        ],
      },
      inputUrl: undefined,
      inputText: undefined,
      videoUrl: undefined,
      videoPath: undefined,
      error: undefined,
    };

    saveProject(project);
    saveServerProject(project);
    console.log("[seed-project] project saved:", projectId);

    return NextResponse.json({ success: true, projectId, sceneCount: project.plan.scenes.length });
  } catch (error) {
    console.error("[seed-project] error:", error);
    return NextResponse.json({ error: "Failed to seed project" }, { status: 500 });
  }
}
