import Link from "next/link";
import { Project } from "@/types";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    planning: "bg-gray-500",
    generating: "bg-yellow-500",
    rendering: "bg-blue-500",
    completed: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-5 transition-all hover:border-white/20 hover:bg-white/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="mb-1 truncate text-base font-semibold text-white group-hover:text-gray-200 transition-colors">
            {project.title}
          </h3>
          <p className="text-xs text-gray-500">
            {formatTimeAgo(project.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium text-white ${statusColors[project.status]}`}
        >
          {project.status}
        </span>
      </div>
      <p className="mb-4 line-clamp-2 text-sm text-gray-400">
        {project.plan.script.slice(0, 120)}...
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>{project.plan.scenes.length} scenes</span>
          <span>{project.plan.duration}s</span>
          <span>{project.plan.aspectRatio}</span>
        </div>
        {project.videoUrl && (
          <span className="flex items-center gap-1.5 text-green-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
            </span>
            Ready
          </span>
        )}
      </div>
    </Link>
  );
}
