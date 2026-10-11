"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface ExampleVideoProps {
  src: string;
  title?: string;
  caption?: string;
  className?: string;
}

/**
 * A self-contained, autoplaying 9:16 preview used on the landing page.
 * Falls back to a poster if the browser cannot play the source.
 */
export default function ExampleVideo({
  src,
  title = "Example output",
  caption,
  className = "",
}: ExampleVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Autoplay is only allowed while muted, so start muted and let the
    // viewer opt in to audio.
    video.muted = true;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => setPlaying(false));
    }

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-full max-w-[300px] overflow-hidden rounded-[2.25rem] border border-white/15 bg-black shadow-2xl shadow-black/60">
        <div className="relative aspect-[9/16] w-full">
          <video
            ref={videoRef}
            src={src}
            className="h-full w-full object-cover"
            playsInline
            loop
            muted={muted}
            preload="metadata"
            aria-label={title}
          />

          {/* Tap-to-play overlay */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause example video" : "Play example video"}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-105">
              {playing ? (
                <Pause className="ml-0 h-7 w-7 text-black" />
              ) : (
                <Play className="ml-1 h-7 w-7 text-black" />
              )}
            </span>
          </button>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute example video" : "Mute example video"}
            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      {caption && <p className="mt-1 text-xs text-gray-500">{caption}</p>}
    </div>
  );
}
