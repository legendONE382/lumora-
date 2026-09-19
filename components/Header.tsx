"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <span className="text-lg font-bold text-black">L</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Lumora
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-8">
          <Link
            href="/create"
            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Create
          </Link>
          <Link
            href="/projects"
            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Projects
          </Link>
        </nav>
        <button
          className="sm:hidden flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {open ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M4 12h16M4 6h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-black/90 px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="/create"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
              onClick={() => setOpen(false)}
            >
              Create
            </Link>
            <Link
              href="/projects"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
              onClick={() => setOpen(false)}
            >
              Projects
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
