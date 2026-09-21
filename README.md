# Lumora AI

> AI-powered video creation studio. Transform any URL or idea into a polished short-form video with generated visuals, narration, and automatic editing.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-38bdf8)

## What It Does

Lumora takes a source URL or text idea and runs an automated production pipeline:

1. **Ingest** — extracts readable content from a URL or accepts raw text
2. **Plan** — generates a creative brief, script, scene breakdown, and shot list
3. **Visuals** — produces scene-level video clips and images
4. **Audio** — generates narration and dialogue audio
5. **Render** — assembles the final MP4 with FFmpeg and serves it for playback

The goal is to go from idea to watchable video in minutes without manual editing.

## Core Features

- **Content ingestion**: paste a URL or write an idea; the app extracts usable source text
- **Creative planning**: Gemini produces a structured plan with scenes, visuals, and narration
- **Media generation**: Pexels/Pollinations-backed visual generation and Piper/ElevenLabs-backed narration
- **Rendering pipeline**: FFmpeg-based composition that concatenates scene clips, normalizes audio/video, and outputs a browser-ready MP4
- **Project persistence**: server-side in-memory store plus client-side localStorage/IndexedDB
- **Playback**: dedicated video serving route with range-friendly HTTP delivery

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, App Router, TypeScript, Tailwind CSS |
| AI / Planning | Google Generative AI (Gemini) |
| Visuals | Pexels, Pollinations |
| Audio | ElevenLabs TTS, Piper |
| Video Assembly | FFmpeg |
| Storage | In-memory server store, localStorage, IndexedDB |

## Prerequisites

- Node.js >= 18
- npm or pnpm
- FFmpeg installed and available on `PATH`
- API keys for Gemini, Pollinations, and ElevenLabs

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

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open the app:
   ```
   http://localhost:3000
   ```

## Environment Variables

See `.env.local.example` for all supported variables.

Required:
- `GEMINI_API_KEY`
- `POLLINATIONS_API_KEY`
- `ELEVENLABS_API_KEY`

Optional:
- `NEXT_PUBLIC_APP_URL`
- `FFMPEG_BINARY`

## Project Structure

```
app/
  api/
    extract/           - URL/text ingestion
    generate-plan/     - Gemini creative plan
    generate-visual/   - Scene visual generation
    generate-audio/    - Narration/audio generation
    render-video/      - FFmpeg video assembly
    video/[id]/        - Final MP4 serving route
    projects/[id]/     - Project state API
  create/              - Creation workspace
  projects/            - Project list and detail pages
components/
  CreationForm.tsx     - Step pipeline UI
  VideoPlayer.tsx      - Video playback component
  Header.tsx           - Site header
  Hero.tsx             - Landing hero
  ProjectCard.tsx      - Project card UI
hooks/
  useLocalStorage.ts   - localStorage hook
lib/
  ai/gemini.ts         - Gemini client
  audio/piper.ts       - Piper TTS client
  creative/planner.ts  - Creative plan generator
  db/indexeddb.ts      - IndexedDB wrapper
  ingestion/extractor.ts - URL/text extractor
  media/pexels.ts      - Pexels client
  projects/storage.ts  - Project persistence
  video/
    audio.ts           - Audio utilities
    ffmpeg.ts          - FFmpeg renderer
    renderer.ts        - Scene rendering
types/
  index.ts             - Shared TypeScript types
```

## How Rendering Works

The render pipeline is intentionally split into isolated stages:

1. **Scene clips** — each scene is normalized to a consistent resolution and frame rate, with narration trimmed to scene duration
2. **Concatenation** — scene clips are joined into a single video master
3. **Audio mux** — narration is muxed into the final MP4 with AAC encoding
4. **Validation** — output is verified for valid video/audio streams before returning success

This keeps the working visual pipeline separate from audio fixes and makes failures easier to diagnose.

## Browser Playback

Final videos are served through `/api/video/[id]`, which returns:
- `Content-Type: video/mp4`
- `Content-Length`
- The full MP4 bytes

The project page resolves `videoUrl` from the project record and passes it to the `<video controls>` player.

## Notes

- Do not commit `.env.local` or any file containing real API keys
- Large generated media lives under `tmp/` and is ignored by git
- The server-side store is in-memory and resets between process restarts
- For production use, move long-running FFmpeg work out of the HTTP request path

## License

MIT
