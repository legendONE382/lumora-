"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getProject, saveProject, updateProjectStatus } from "@/lib/projects/storage";
import Header from "@/components/Header";
import { Project, Scene } from "@/types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const STEPS = [
  { id: "extract", label: "Understanding your input", description: "Reading the source material" },
  { id: "plan", label: "Building the creative concept", description: "Structuring the video idea" },
  { id: "visuals", label: "Finding the right visuals", description: "Searching Pexels media" },
  { id: "audio", label: "Recording narration", description: "Synthesizing voice audio" },
  { id: "render", label: "Rendering your video", description: "Assembling scenes and audio" },
  { id: "done", label: "Video ready", description: "Preparing your project" },
];

function CreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string | null>(null);

  const url = searchParams.get("url") || "";
  const idea = searchParams.get("idea") || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!url && !idea) {
      router.push("/");
      return;
    }
    startPipeline();
  }, [mounted, url, idea]);

  const updateStep = (stepId: string, message: string, progressValue: number) => {
    setProgress({ step: stepId, message, progress: progressValue });
  };

  const startPipeline = async () => {
    try {
      updateStep("extract", "Understanding your input...", 10);

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: idea }),
      });

      if (!extractRes.ok) throw new Error("Failed to extract content");
      const { projectId, project } = await extractRes.json();

      if (project) {
        saveProject(project);
      }

      updateStep("plan", "Building the creative concept...", 25);
      const planRes = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: idea, projectId }),
      });

      if (!planRes.ok) throw new Error("Failed to generate plan");
      const { plan } = await planRes.json();

      const currentProject = getProject(projectId);
      if (!currentProject) throw new Error("Project lost");
      currentProject.plan = plan;
      saveProject(currentProject);
      setProjectTitle(plan.title);

      updateStep("visuals", "Finding the right visuals...", 45);
      const visualsRes = await fetch("/api/generate-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan }),
      });

      if (!visualsRes.ok) throw new Error("Failed to generate visuals");
      const { scenes: visualScenes } = await visualsRes.json();

      const projectAfterVisuals = getProject(projectId);
      if (!projectAfterVisuals) throw new Error("Project lost during visuals");
      projectAfterVisuals.plan.scenes = visualScenes;
      saveProject(projectAfterVisuals);

      updateStep("audio", "Recording narration...", 65);
      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan: projectAfterVisuals.plan }),
      });

      if (!audioRes.ok) throw new Error("Failed to generate audio");
      const { audioDataUrls } = await audioRes.json();

      const projectAfterAudio = getProject(projectId);
      if (!projectAfterAudio) throw new Error("Project lost during audio");
      projectAfterAudio.plan.scenes = projectAfterAudio.plan.scenes.map((scene) => {
        const audioData = audioDataUrls.find((a: any) => a.sceneId === scene.id);
        return {
          ...scene,
          audioUrl: audioData?.dataUrl || undefined,
          audioPath: audioData?.path || undefined,
        };
      });
      saveProject(projectAfterAudio);

      updateStep("render", "Rendering your video...", 85);

      const renderRes = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!renderRes.ok) {
        const errorData = await renderRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to render video");
      }

      const renderResult = await renderRes.json();
      console.log("[create] render result:", renderResult);

      updateProjectStatus(projectId, "completed");
      updateStep("done", "Video ready!", 100);

      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1500);
    } catch (err) {
      console.error("[create] pipeline error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Something went wrong</h2>
          <p className="mb-6 text-gray-400">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl bg-white/10 px-6 py-3 text-white hover:bg-white/20"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (progress?.step === "done") {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Video Ready!</h2>
          <p className="mb-6 text-gray-400">Redirecting to your project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
        <div className="mb-8">
          <div className="mb-1 text-sm text-gray-500">
            {url && (
              <span className="mr-3 truncate inline-block align-middle">
                {url}
              </span>
            )}
            {idea && (
              <span className="truncate inline-block align-middle">
                {idea}
              </span>
            )}
          </div>
          {projectTitle && (
            <h2 className="text-2xl font-bold text-white">{projectTitle}</h2>
          )}
          {!projectTitle && (
            <h2 className="text-2xl font-bold text-white">Creating Your Video</h2>
          )}
          <p className="mt-1 text-gray-400">
            This usually takes 1-3 minutes. Please keep this tab open.
          </p>
        </div>
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isActive = progress?.step === step.id;
            const isCompleted =
              progress &&
              STEPS.findIndex((s) => s.id === progress.step) >
                STEPS.findIndex((s) => s.id === step.id);

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
                  isActive
                    ? "border-white/20 bg-white/5"
                    : isCompleted
                    ? "border-white/10 bg-white/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex-shrink-0">
                  {isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-gray-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${
                      isActive ? "text-white" : isCompleted ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">
                    {isActive ? progress?.message : step.description}
                  </p>
                </div>
                {isActive && (
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {Math.round(progress?.progress || 0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black">
          <Header />
          <div className="mx-auto max-w-2xl px-4 py-20 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-700 border-t-transparent animate-spin" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}
