import path from "node:path";
import fs from "node:fs";
import { Scene } from "@/types";

export interface SubtitleEntry {
  index: number;
  start: number;
  end: number;
  text: string;
}

function escapeSrtText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function splitIntoLines(text: string, maxWordsPerLine: number = 6, maxLines: number = 2): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  if (words.length <= maxWordsPerLine) {
    return [text];
  }

  const lines: string[] = [];
  let currentLine: string[] = [];

  for (const word of words) {
    currentLine.push(word);
    if (currentLine.length >= maxWordsPerLine) {
      lines.push(currentLine.join(" "));
      currentLine = [];
    }
  }

  if (currentLine.length) {
    lines.push(currentLine.join(" "));
  }

  if (lines.length > maxLines) {
    return [lines.slice(0, maxLines).join(" "), lines.slice(maxLines).join(" ")];
  }

  return lines;
}

export function buildSubtitleEntries(scenes: Scene[]): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = 0;

  for (const scene of scenes) {
    const narration = (scene.narration || "").trim();
    if (!narration) {
      currentTime += scene.duration;
      continue;
    }

    const lines = splitIntoLines(narration, 6, 2);
    const subtitleText = lines.join("\\N");
    const start = currentTime;
    const end = currentTime + scene.duration;

    entries.push({
      index: entries.length + 1,
      start,
      end,
      text: subtitleText,
    });

    currentTime = end;
  }

  return entries;
}

export function generateSrt(scenes: Scene[], outputPath: string): string {
  const entries = buildSubtitleEntries(scenes);
  const srtContent = entries
    .map((entry) => {
      return `${entry.index}\n${formatSrtTime(entry.start)} --> ${formatSrtTime(entry.end)}\n${escapeSrtText(entry.text)}\n`;
    })
    .join("\n");

  fs.writeFileSync(outputPath, srtContent, "utf-8");
  console.log(`[subtitles] generated ${entries.length} entries: ${outputPath}`);
  return outputPath;
}

export function getSubtitlePath(projectDir: string): string {
  return path.join(projectDir, "subtitles.srt");
}
