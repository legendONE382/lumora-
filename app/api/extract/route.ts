import { NextResponse } from "next/server";
import { extractUrlContent, extractTextContent } from "@/lib/ingestion/extractor";
import { saveProject } from "@/lib/projects/storage";
import { Project } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, text } = body;

    let extractedContent;

    if (url && typeof url === "string" && url.trim()) {
      extractedContent = await extractUrlContent(url.trim());
    } else if (text && typeof text === "string" && text.trim()) {
      extractedContent = await extractTextContent(text.trim());
    } else {
      return NextResponse.json(
        { error: "URL or text is required" },
        { status: 400 }
      );
    }

    const project: Project = {
      id: crypto.randomUUID(),
      title: extractedContent.title || "Untitled Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "planning",
      plan: {
        title: extractedContent.title || "Untitled Project",
        goal: "",
        audience: "",
        tone: "",
        visualStyle: "",
        duration: 60,
        aspectRatio: "9:16",
        concept: "",
        script: "",
        scenes: [],
      },
      inputUrl: url || "",
      inputText: text || "",
    };

    saveProject(project);

    return NextResponse.json({ projectId: project.id, content: extractedContent, project });
  } catch (error) {
    console.error("Extraction error:", error);
    const message = error instanceof Error ? error.message : "Extraction failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
