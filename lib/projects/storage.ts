import { Project } from "@/types";
import { saveVideoBlob, getVideoBlob, deleteVideoBlob } from "@/lib/db/indexeddb";
import fs from "node:fs";
import path from "node:path";

const STORAGE_KEY = "lumora_projects";

// In-memory server-side storage with file persistence
const serverStoreFile = path.join(process.cwd(), "tmp", "server-store.json");
const serverStore = new Map<string, Project>();

function loadServerStore(): void {
  try {
    if (fs.existsSync(serverStoreFile)) {
      const data = fs.readFileSync(serverStoreFile, "utf-8");
      const projects = JSON.parse(data) as Project[];
      projects.forEach((p) => serverStore.set(p.id, p));
    }
  } catch {
    // ignore load errors
  }
}

function saveServerStore(): void {
  try {
    const dir = path.dirname(serverStoreFile);
    fs.mkdirSync(dir, { recursive: true });
    const data = JSON.stringify(Array.from(serverStore.values()));
    fs.writeFileSync(serverStoreFile, data);
  } catch {
    // ignore save errors
  }
}

loadServerStore();

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
    saveServerStore();
    return;
  }
  clientSaveProject(project);
}

export function deleteProject(id: string): void {
  if (isServer()) {
    serverStore.delete(id);
    saveServerStore();
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

  const blob = await getVideoBlob(id);
  if (blob) {
    return URL.createObjectURL(blob);
  }
  return undefined;
}
