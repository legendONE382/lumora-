import { Project } from "@/types";

const STORAGE_KEY = "lumora_projects";

// In-memory server-side storage (no file I/O here)
const serverStore = (globalThis as any).lumoraServerStore || ((globalThis as any).lumoraServerStore = new Map<string, Project>());

function isServer(): boolean {
  return typeof window === "undefined";
}

function clientGetProjects(): Project[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function stripLargeClientFields(project: Project): Project {
  return {
    ...project,
    plan: {
      ...project.plan,
      scenes: project.plan.scenes.map((scene) => ({
        ...scene,
        audioUrl: undefined,
      })),
    },
  };
}

function clientSaveProject(project: Project): void {
  try {
    const projects = clientGetProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    const stored = stripLargeClientFields(project);
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...stored, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift(stored);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.warn("[storage] localStorage quota exceeded, pruning old projects...");
      try {
        let projects = clientGetProjects();
        const existingIndex = projects.findIndex((p) => p.id === project.id);
        const stored = stripLargeClientFields(project);
        if (existingIndex >= 0) {
          projects[existingIndex] = { ...stored, updatedAt: new Date().toISOString() };
        } else {
          projects.unshift(stored);
        }
        const trimmed = projects.slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (retryError) {
        console.error("[storage] failed to save project after pruning:", retryError);
      }
    } else {
      console.error("[storage] failed to save project:", error);
    }
  }
}

export function getProjects(): Project[] {
  if (isServer()) {
    return Array.from(serverStore.values());
  }
  return clientGetProjects();
}

export function getProject(id: string): Project | undefined {
  if (isServer()) {
    return serverStore.get(id);
  }
  return clientGetProjects().find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  if (isServer()) {
    serverStore.set(project.id, { ...project, updatedAt: new Date().toISOString() });
    return;
  }
  clientSaveProject(project);
}

export function deleteProject(id: string): void {
  if (isServer()) {
    serverStore.delete(id);
    return;
  }
  try {
    const projects = clientGetProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("[storage] failed to delete project:", error);
  }
}

export function updateProjectStatus(
  id: string,
  status: Project["status"],
  error?: string
): void {
  const project = getProject(id);
  if (project) {
    project.status = status;
    if (error) project.error = error;
    saveProject(project);
  }
}

export async function updateProjectVideoUrl(id: string, videoUrl: string): Promise<void> {
  const project = getProject(id);
  if (project) {
    project.videoUrl = videoUrl;
    project.status = "completed";
    saveProject(project);
  }
}

export async function getProjectVideoUrl(id: string): Promise<string | undefined> {
  const project = getProject(id);
  if (!project) return undefined;

  if (project.videoUrl) {
    if (project.videoUrl.startsWith("/api/video/")) {
      return project.videoUrl;
    }
    if (!project.videoUrl.startsWith("blob:")) {
      return project.videoUrl;
    }
  }

  if (project.videoPath) {
    return `/api/video/${id}`;
  }

  return undefined;
}
