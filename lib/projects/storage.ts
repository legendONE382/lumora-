import { Project } from "@/types";
import { saveVideoBlob, getVideoBlob, deleteVideoBlob } from "@/lib/db/indexeddb";

const STORAGE_KEY = "lumora_projects";

// In-memory server-side storage
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

function clientSaveProject(project: Project): void {
  const projects = clientGetProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.unshift(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
  const projects = clientGetProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  deleteVideoBlob(id).catch(() => {});
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
  if (!project || !project.videoUrl) return undefined;

  if (project.videoUrl.startsWith("/api/video/")) {
    return project.videoUrl;
  }

  if (!project.videoUrl.startsWith("blob:")) {
    return project.videoUrl;
  }

  const blob = await getVideoBlob(id);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return undefined;
}
