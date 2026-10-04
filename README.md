# Lumora AI

> AI-powered video creation studio. Transform any URL or idea into a polished short-form video with stock visuals, generated narration, and automatic editing.

![Next.js](https://img.shields.io/badge/Next.js-16%20(canary)-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.x-38bdf8)

## What It Does

Lumora takes a source URL or a text idea and runs an automated production pipeline:

1. **Ingest** — extracts readable content from a URL or accepts raw text
2. **Plan** — generates a creative brief, script, scene breakdown, and per-scene media search queries
3. **Visuals** — finds and downloads scene-level stock photos and video clips from Pexels
4. **Audio** — generates narration audio per scene with a local Piper TTS model
5. **Render** — assembles the final MP4 with FFmpeg and serves it for playback

The goal is to go from idea to watchable vertical video in minutes without manual editing.

## Core Features

- **Content ingestion**: paste a URL or write an idea; the app extracts usable source text
- **Creative planning**: Gemini produces a structured plan (goal, audience, tone, style, script, scenes, search queries)
- **Media sourcing**: Pexels-backed photo/video search with candidate scoring and automatic download
- **Narration**: Piper (local, offline) text-to-speech, one WAV per scene
- **Rendering pipeline**: FFmpeg-based composition that normalizes each scene, concatenates clips, burns in subtitles, and outputs a browser-ready MP4
- **Project persistence**: server-side stores (in-memory + JSON file) plus client-side `localStorage`
- **Playback**: dedicated video serving route with a `Content-Type: video/mp4` response

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router, canary), TypeScript, Tailwind CSS 4 |
| AI / Planning | Google Generative AI (Gemini `gemini-2.5-flash`) |
| Visuals | Pexels Photos & Videos API |
| Audio | Piper TTS (local Python model) |
| Video Assembly | FFmpeg (system binary, invoked via Node `child_process`) |
| Storage | In-memory server store + `tmp/server-store.json`, `localStorage` |

## Prerequisites

- Node.js >= 18
- npm
- **FFmpeg** installed and available on `PATH` (or set `FFMPEG_BINARY`)
- **Python** with the `piper-tts` package installed (invoked as `python -m piper` by default)
- A **Piper voice model** on disk (default: `tmp/piper-voices/en_US-amy-medium.onnx` plus its `.onnx.json` config)
- API keys for Gemini and Pexels

## Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/legendONE382/lumora-.git
   cd lumora-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```

4. Download a Piper voice model into `tmp/piper-voices/` (or point `PIPER_VOICE_DIR` at your own copy), e.g. `en_US-amy-medium.onnx` and `en_US-amy-medium.onnx.json`.

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open the app:
   ```
   http://localhost:3000
   ```

## Environment Variables

See `.env.local.example` for the full list.

Required:
- `GEMINI_API_KEY` — creative plan and script generation. If unset, Lumora falls back to a built-in local plan instead of failing.
- `PEXELS_API_KEY` — stock photo/video search. Required to fetch real scene media.

Optional:
- `FFMPEG_BINARY` — custom FFmpeg binary path. Defaults to `ffmpeg` on `PATH`.

Piper TTS (all optional, with defaults):
- `PIPER_VOICE_DIR` — directory holding the voice models (default: `tmp/piper-voices`)
- `PIPER_MODEL` — voice name without extension (default: `en_US-amy-medium`)
- `PIPER_BINARY` — Python binary (default: `python`)
- `PIPER_SCRIPT` — interpreter flag (default: `-m`)
- `PIPER_MODULE` — module to run (default: `piper`)

## Project Structure

```
app/
  api/
    extract/           - URL/text ingestion; creates the project
    generate-plan/     - Gemini creative plan
    generate-visual/   - Pexels scene media search + download
    generate-audio/    - Piper narration generation
    render-video/      - FFmpeg video assembly
    video/[id]/        - Final MP4 serving route
    projects/[id]/     - Project detail API
    seed-project/      - Dev utility: seeds a sample project
    test/              - Dev utility: health check
  create/              - Creation workspace (runs the pipeline client-side)
  projects/            - Project list page
  projects/[id]/       - Project detail page
  page.tsx             - Landing page
  layout.tsx           - Root layout
components/
  Header.tsx           - Site header
  Hero.tsx             - Landing hero + input form
  CreationForm.tsx     - Legacy pipeline UI (unused)
  ProjectCard.tsx      - Project card UI
  VideoPlayer.tsx      - Video playback component
hooks/
  useLocalStorage.ts   - localStorage hook
lib/
  ai/gemini.ts         - Gemini client, structured plan + fallback
  audio/piper.ts       - Piper TTS runner
  creative/planner.ts  - Creative plan helper
  db/indexeddb.ts      - IndexedDB helper (currently unused)
  ingestion/extractor.ts - URL/text extractor
  media/pexels.ts      - Pexels client + candidate scoring
  projects/storage.ts  - Project persistence (server Map / localStorage)
  projects/server-store.ts - File-backed server project store
  video/
    ffmpeg.ts          - FFmpeg renderer (scene clips + concat + subtitles)
    renderer.ts        - Browser canvas renderer (unused)
    audio.ts           - ElevenLabs client (unused)
    subtitles.ts       - SRT generation and timing
types/
  index.ts             - Shared TypeScript types
```

## How the Pipeline Works

`app/create/page.tsx` runs the stages in sequence from the browser and reports progress:

1. **`/api/extract`** — scrapes the URL (title, meta description, cleaned text) or takes raw text, then creates and stores a `Project`.
2. **`/api/generate-plan`** — sends the input to Gemini with a response schema, retries on rate limits, and normalizes the result. Falls back to a local plan when Gemini is unavailable.
3. **`/api/generate-visual`** — for each scene, searches Pexels photos and videos, scores candidates against the scene's search query, and downloads the best match to `tmp/<projectId>/scene-N/`.
4. **`/api/generate-audio`** — synthesizes narration for each scene with Piper and writes `narration-<timestamp>.wav` into the project directory.
5. **`/api/render-video`** — builds the final MP4 (see below) and marks the project `completed`.

## How Rendering Works

The render pipeline (`lib/video/ffmpeg.ts`) is intentionally split into isolated stages:

1. **Scene clips** — each scene is normalized to `1080x1920` at `30fps`. A downloaded video is scaled and center-cropped; a still image gets a slow `zoompan` Ken Burns move; if neither exists, a black clip is produced. Narration is muxed into the clip as AAC when present.
2. **Concatenation** — the scene clips are joined into a single video/audio master with FFmpeg's `concat` filter.
3. **Subtitles** — an `.srt` is generated from the narration (`lib/video/subtitles.ts`) and burned into the video with the `subtitles` filter.
4. **Output** — the result is written to `tmp/<projectId>/final.mp4` with `+faststart` for progressive playback.

Scene media is written under `tmp/<projectId>/scene-<n>/` (`scene.mp4` or `scene.jpg`), and its path is stored on the scene record.

This keeps the visual pipeline separate from audio and makes failures easier to diagnose.

## Browser Playback

Final videos are served through `/api/video/[id]`, which returns:
- `Content-Type: video/mp4`
- `Content-Length`
- The full MP4 bytes

The project page resolves the video URL from the project record and passes it to the `<video>` player.

## Notes

- Do not commit `.env.local` or any file containing real API keys
- Large generated media lives under `tmp/` and is ignored by git
- The server stores are process-bound (in-memory Map plus a JSON snapshot), so state can lag across restarts
- For production use, move long-running FFmpeg work out of the HTTP request path
- `components/CreationForm.tsx`, `lib/video/renderer.ts`, `lib/video/audio.ts`, `lib/creative/planner.ts`, and `lib/db/indexeddb.ts` are not wired into the active pipeline

## License

MIT
