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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = async () => {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative aspect-[9/16] overflow-hidden rounded-3xl bg-black border border-white/10">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-cover"
          playsInline
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity hover:opacity-100">
          <button
            onClick={togglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-colors hover:bg-white"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-black" />
            ) : (
              <Play className="ml-1 h-6 w-6 text-black" />
            )}
          </button>
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-white transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white truncate">{title}</h3>
        <div className="flex gap-2">
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
