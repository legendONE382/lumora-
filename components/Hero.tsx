"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, FileText, ArrowRight, Sparkles } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Create a 30-second product ad",
  "Introduce my company",
  "Turn this product into a social video",
];

export default function Hero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url && !idea) return;
    setLoading(true);
    router.push(`/create?url=${encodeURIComponent(url)}&idea=${encodeURIComponent(idea)}`);
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-zinc-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.04),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.06),transparent_50%)]" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300">
          <Sparkles className="h-4 w-4 text-white/80" />
          AI-Powered Creative Studio
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl">
          Turn ideas into{" "}
          <span className="text-white/90">videos.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 sm:text-xl leading-relaxed">
          Give Lumora a website, a product, or just an idea. It understands what
          you&apos;re trying to communicate and creates the video for you.
        </p>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Link2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a website or product URL"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
              />
            </div>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Tell Lumora what you want the video to communicate..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-12 py-4 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!url && !idea)}
              className="group flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Starting..." : "Create Video"}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-gray-500">Try:</span>
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setIdea(prompt)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-300 transition-all hover:border-white/20 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
