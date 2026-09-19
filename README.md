# Lumora AI

AI-powered video creation studio MVP built with Next.js.

## Features

- URL/text idea ingestion
- Gemini-powered creative plan generation
- Pollinations.ai visual generation
- ElevenLabs TTS narration
- Client-side video rendering with Canvas API
- localStorage + IndexedDB project persistence

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   POLLINATIONS_API_KEY=your_pollinations_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Getting API Keys

- **Gemini API Key**: Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Pollinations API Key**: Get one at [Pollinations](https://pollinations.ai) (works without key for low volume)
- **ElevenLabs API Key**: Get one free at [ElevenLabs](https://elevenlabs.io) (free tier includes 10,000 chars/month)

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Google Generative AI (Gemini)
- Pollinations.ai
- ElevenLabs TTS
- Canvas API for video rendering
- IndexedDB for video storage
- localStorage for project history

## Architecture

```
app/
  api/           - API routes for server-side operations
  create/        - Creation workspace
  projects/      - Project history and detail pages
components/      - Reusable UI components
lib/
  ai/            - Gemini communication
  ingestion/     - URL/text extraction
  video/         - Image download, TTS, rendering
  projects/      - localStorage persistence
  db/            - IndexedDB for video blobs
types/           - TypeScript type definitions
```

## Notes

- Video rendering is done client-side using the Canvas API
- Large video files are stored in IndexedDB (not localStorage)
- The pipeline is fully functional with real API integrations
- No mocked or fake functionality
