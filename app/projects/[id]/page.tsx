"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import { Project } from "@/types";
import { getProject, getProjectVideoUrl, saveProject } from "@/lib/projects/storage";
import { ArrowLeft, RefreshCw } from "lucide-react";

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (params.id && typeof params.id === "string") {
      let p = getProject(params.id);
      
      if (!p) {
        fetch(`/api/projects/${params.id}`)
          .then((res) => {
            if (!res.ok) throw new Error("Project not found");
            return res.json();
          })
          .then((project) => {
            saveProject(project);
            setProject(project);
            if (project?.videoUrl) {
              getProjectVideoUrl(params.id).then((url) => {
                setVideoUrl(url);
              });
            }
          })
          .catch(() => {
            setProject(null);
          });
      } else {
        setProject(p);
        if (p?.videoUrl) {
          getProjectVideoUrl(params.id).then((url) => {
            setVideoUrl(url);
          });
        } else {
          setVideoUrl(`/api/video/${params.id}`);
        }
      }
    }
  }, [params.id]);

  if (!mounted) return null;

  if (!project) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-xl text-gray-400">Project not found</p>
          <button
            onClick={() => router.push("/projects")}
            className="mt-6 rounded-xl bg-white/10 px-6 py-3 text-white hover:bg-white/20"
          >
            Back to Projects
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push("/projects")}
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">{project.title}</h1>
            <p className="mb-8 text-sm text-gray-400">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
            {videoUrl ? (
              <VideoPlayer
                videoUrl={videoUrl}
                title={project.title}
                onRevise={() =>
                  router.push(
                    `/create?url=${encodeURIComponent(project.inputUrl || "")}&idea=${encodeURIComponent(project.inputText || "")}`
                  )
                }
              />
            ) : (
              <div className="aspect-[9/16] rounded-3xl border border-dashed border-white/10 bg-white/5 flex items-center justify-center">
                <div className="text-center">
                  {project.status === "error" ? (
                    <>
                      <p className="text-red-400 font-medium">Generation Failed</p>
                      <p className="mt-2 text-sm text-gray-500">{project.error}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Video is being generated...</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Creative Plan</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Goal:</span>
                  <span className="ml-2 text-gray-300">{project.plan.goal}</span>
                </div>
                <div>
                  <span className="text-gray-500">Audience:</span>
                  <span className="ml-2 text-gray-300">{project.plan.audience}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tone:</span>
                  <span className="ml-2 text-gray-300">{project.plan.tone}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 text-gray-300">{project.plan.duration}s</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Script</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
                {project.plan.script}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Scenes ({project.plan.scenes.length})
              </h3>
              <div className="space-y-4">
                {project.plan.scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {scene.id}
                      </span>
                      <span className="text-xs text-gray-500">{scene.duration}s</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{scene.narration}</p>
                    <p className="text-xs text-gray-500 italic">
                      Visual: {scene.visualDescription}
                    </p>
                    {scene.onScreenText && (
                      <p className="mt-2 text-xs text-gray-500">
                        Text: &ldquo;{scene.onScreenText}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-2 text-lg font-semibold text-white">Revise</h3>
              <p className="mb-3 text-sm text-gray-400">
                What would you like to change?
              </p>
              <button
                onClick={() =>
                  router.push(
                    `/create?url=${encodeURIComponent(project.inputUrl || "")}&idea=${encodeURIComponent(project.inputText || "")}`
                  )
                }
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4" />
                Create new version
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black">
          <Header />
          <div className="mx-auto max-w-2xl px-4 py-20 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-700 border-t-transparent animate-spin" />
            <p className="text-gray-400">Loading project...</p>
          </div>
        </main>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
