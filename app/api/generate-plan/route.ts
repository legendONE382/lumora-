import { NextResponse } from "next/server";
import { generateCreativePlan } from "@/lib/ai/gemini";
import { getProject, saveProject } from "@/lib/projects/storage";
import { saveServerProject } from "@/lib/projects/server-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, text, projectId } = body;

    console.log("[generate-plan] received:", { url, text: text?.slice(0, 50), projectId });

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const project = getProject(projectId);
    if (!project) {
      console.log("[generate-plan] project not found:", projectId);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    console.log("[generate-plan] calling generateCreativePlan...");
    const plan = await generateCreativePlan(url, text);
    console.log("[generate-plan] plan generated:", plan.title);

    project.plan = plan;
    project.title = plan.title;
    project.status = "generating";
    saveProject(project);
    saveServerProject(project);

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[generate-plan] error:", error);
    const message = error instanceof Error ? error.message : "Plan generation failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
