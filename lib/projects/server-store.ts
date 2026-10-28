import fs from "node:fs";
import path from "node:path";
import { Project } from "@/types";

const DATA_DIR = process.env.LUMORA_DATA_DIR
  ? path.resolve(process.env.LUMORA_DATA_DIR)
  : path.join(process.cwd(), "tmp");

const serverStoreFile = path.join(DATA_DIR, "server-store.json");
const serverStore = new Map<string, Project>();

function loadServerStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(serverStoreFile)) {
      const raw = fs.readFileSync(serverStoreFile, "utf-8");
      const projects = JSON.parse(raw) as Project[];
      projects.forEach((p) => {
        if (p.status === "rendering") {
          console.warn("[server-store] resetting stale rendering state for project", p.id);
          p.status = "error";
          p.error = "Rendering was interrupted (server restarted). Please retry.";
        }
        serverStore.set(p.id, p);
      });
      console.log("[server-store] loaded", serverStore.size, "projects from", serverStoreFile);
    }
  } catch (error) {
    console.error("[server-store] failed to load:", error);
  }
}

function persistServerStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = JSON.stringify(Array.from(serverStore.values()));
    fs.writeFileSync(serverStoreFile, payload, "utf-8");
  } catch (error) {
    console.error("[server-store] failed to persist:", error);
    throw error;
  }
}

loadServerStore();

export function getServerProject(id: string): Project | undefined {
  return serverStore.get(id);
}

export function saveServerProject(project: Project): void {
  serverStore.set(project.id, { ...project, updatedAt: new Date().toISOString() });
  persistServerStore();
}

export function deleteServerProject(id: string): void {
  serverStore.delete(id);
  persistServerStore();
}

export function getAllServerProjects(): Project[] {
  return Array.from(serverStore.values());
}

export function updateServerProjectStatus(
  id: string,
  status: Project["status"],
  error?: string
): void {
  const project = serverStore.get(id);
  if (project) {
    project.status = status;
    if (error) project.error = error;
    project.updatedAt = new Date().toISOString();
    serverStore.set(id, project);
    persistServerStore();
  } else {
    console.warn("[server-store] updateProjectStatus: project not found:", id);
  }
}

export function getServerProjectVideoUrl(id: string): string | undefined {
  const project = serverStore.get(id);
  if (!project) return undefined;
  if (project.videoUrl) {
    if (project.videoUrl.startsWith("/api/video/")) return project.videoUrl;
    if (!project.videoUrl.startsWith("blob:")) return project.videoUrl;
  }
  if (project.videoPath) return `/api/video/${id}`;
  return undefined;
}

export function updateServerProjectVideoUrl(id: string, videoUrl: string): void {
  const project = serverStore.get(id);
  if (project) {
    project.videoUrl = videoUrl;
    project.status = "completed";
    project.updatedAt = new Date().toISOString();
    serverStore.set(id, project);
    persistServerStore();
  } else {
    console.warn("[server-store] updateProjectVideoUrl: project not found:", id);
  }
}

export { DATA_DIR };
