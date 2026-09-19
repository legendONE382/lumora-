"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveProject } from "@/lib/projects/storage";

const STEPS = [
  { id: "extract", label: "Extracting Content" },
  { id: "plan", label: "Generating Creative Plan" },
  { id: "visuals", label: "Creating Visuals" },
  { id: "audio", label: "Generating Narration" },
  { id: "render", label: "Rendering Video" },
];

export default function CreationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const url = searchParams.get("url") || "";
  const idea = searchParams.get("idea") || "";

  useEffect(() => {
    if (!url && !idea) {
      router.push("/");
      return;
    }
    startPipeline();
  }, []);

  const startPipeline = async () => {
    try {
      setProgress({
        step: "extract",
        message: "Extracting content...",
        progress: 10,
      });

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

      setProgress({
        step: "plan",
        message: "Generating creative plan...",
        progress: 25,
      });

      const planRes = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: idea }),
      });

      if (!planRes.ok) throw new Error("Failed to generate plan");
      const { plan } = await planRes.json();

      if (plan) {
        const existingProject = JSON.parse(localStorage.getItem("lumora_projects") || "[]").find((p: any) => p.id === projectId);
        if (existingProject) {
          existingProject.plan = plan;
          existingProject.status = "planning";
          saveProject(existingProject);
        }
      }

      setProgress({
        step: "visuals",
        message: "Creating visuals...",
        progress: 45,
      });

      const visualsRes = await fetch("/api/generate-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan }),
      });

      if (!visualsRes.ok) throw new Error("Failed to generate visuals");

      setProgress({
        step: "audio",
        message: "Generating narration...",
        progress: 65,
      });

      const audioRes = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan }),
      });

      if (!audioRes.ok) throw new Error("Failed to generate audio");

      setProgress({
        step: "render",
        message: "Rendering video...",
        progress: 85,
      });

      const renderRes = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, plan }),
      });

      if (!renderRes.ok) throw new Error("Failed to render video");
      const data = await renderRes.json();

      if (data.project) {
        saveProject(data.project);
      }

      setProgress({
        step: "done",
        message: "Video ready!",
        progress: 100,
      });

      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-2xl font-bold text-white">Something went wrong</h2>
        <p className="mb-6 text-gray-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-white/10 px-6 py-3 text-white hover:bg-white/20"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-bold text-white">Creating Your Video</h2>
        <p className="text-gray-400">
          This usually takes 1-3 minutes. Please keep this tab open.
        </p>
      </div>
      <div className="space-y-4">
        {STEPS.map((step) => {
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
                  ? "border-purple-500/50 bg-purple-500/10"
                  : isCompleted
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex-shrink-0">
                {isActive ? (
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    isActive ? "text-purple-300" : isCompleted ? "text-green-300" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="mt-1 text-sm text-gray-500">{progress?.message}</p>
                )}
              </div>
              {isActive && (
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {Math.round(progress?.progress || 0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
