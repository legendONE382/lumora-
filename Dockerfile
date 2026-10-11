# syntax=docker/dockerfile:1

# Lumora AI — production image for Render
#
# This image bundles everything the render pipeline needs:
#   - Node.js 20 (Next.js app)
#   - FFmpeg with libass (required for the `subtitles` burn-in filter)
#   - Fontconfig + DejaVu fonts (required to rasterise subtitle text)
#   - Python 3 + piper-tts (local, free narration synthesis)

FROM node:20-bookworm-slim

# --- System packages -------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        ffmpeg \
        fontconfig \
        fonts-dejavu-core \
        python3 \
        python3-pip \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Verify FFmpeg is present and can burn subtitles (libass-backed filter).
RUN ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' subtitles ' \
    && echo "ffmpeg subtitles filter: OK" \
    || (echo "FATAL: ffmpeg was built without the subtitles filter" && exit 1)

# --- Piper TTS (narration) ------------------------------------------------
# Installed into an isolated venv so it cannot collide with system packages.
ENV PIPER_VENV=/opt/piper
RUN python3 -m venv "$PIPER_VENV" \
    && "$PIPER_VENV/bin/pip" install --no-cache-dir --upgrade pip \
    && "$PIPER_VENV/bin/pip" install --no-cache-dir piper-tts

ENV PATH="$PIPER_VENV/bin:$PATH"

# --- Application -----------------------------------------------------------
WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Runtime configuration for the container.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PIPER_BINARY=python3 \
    PIPER_VOICE_DIR=/app/voices \
    PIPER_MODEL=en_US-amy-medium

RUN npm run build

EXPOSE 3000

# Render provides a PORT env var; fall back to 3000 for local docker runs.
CMD ["sh", "-c", "next start -p ${PORT:-3000} -H 0.0.0.0"]
