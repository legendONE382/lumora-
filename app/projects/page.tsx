"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import { Project } from "@/types";
import { getProjects } from "@/lib/projects/storage";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    (async () => {
      try {
        const local = getProjects();
        const res = await fetch("/api/projects");
        const data = res.ok ? await res.json() : { projects: [] };
        const serverProjects: Project[] = data.projects || [];

        const merged = new Map<string, Project>();
        for (const p of local) merged.set(p.id, p);
        for (const p of serverProjects) merged.set(p.id, p);

        if (!cancelled) {
          setProjects(
            Array.from(merged.values()).sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        }
      } catch (err) {
        console.error("[projects] failed to load:", err);
        if (!cancelled) setProjects(getProjects());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="mt-1 text-sm text-gray-400">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-gray-100"
          >
            New Project
          </a>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-8 py-20 text-center">
            <p className="text-lg text-gray-400">No projects yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Create your first video to see it here.
            </p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Get Started
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
