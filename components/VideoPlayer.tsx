"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, RefreshCw } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onRevise?: () => void;
}

export default function VideoPlayer({ videoUrl, title, onRevise }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => setIsPlaying(false);
    const handleCanPlay = () => {
      setLoading(false);
      setError(null);
    };
    const handleLoadedMetadata = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError("This video could not be loaded. It may still be rendering.");
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      void video.play().catch(() => {
        setError("Playback was blocked by the browser.");
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${title.replace(/\s+/g, "_")}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative aspect-[9/16] overflow-hidden rounded-3xl bg-zinc-950 border border-white/10">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-cover"
          playsInline
          preload="metadata"
        />

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center">
            <p className="text-sm font-medium text-red-400">
              Video unavailable
            </p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${
              isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
            }`}
          >
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-black" />
              ) : (
                <Play className="ml-1 h-6 w-6 text-black" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-white">{title}</h3>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          {onRevise && (
            <button
              onClick={onRevise}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Revise
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
