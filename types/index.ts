export interface Scene {
  id: string;
  duration: number;
  narration: string;
  visualDescription: string;
  onScreenText: string;
  searchQueries?: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioPath?: string;
}

export interface CreativePlan {
  title: string;
  goal: string;
  audience: string;
  tone: string;
  visualStyle: string;
  duration: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  concept: string;
  script: string;
  scenes: Scene[];
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: "planning" | "generating" | "rendering" | "completed" | "error";
  plan: CreativePlan;
  inputUrl?: string;
  inputText?: string;
  videoUrl?: string;
  videoPath?: string;
  error?: string;
}

export type ProgressStep = "extract" | "plan" | "visuals" | "audio" | "render" | "done";

export interface GenerationProgress {
  step: ProgressStep;
  message: string;
  progress: number;
}
