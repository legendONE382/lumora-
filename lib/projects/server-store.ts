import fs from "node:fs";
import path from "node:path";
import { Project } from "@/types";

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

function persistServerStore(): void {
  try {
    const dir = path.dirname(serverStoreFile);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(serverStoreFile, JSON.stringify(Array.from(serverStore.values())));
  } catch {
    // ignore save errors
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
