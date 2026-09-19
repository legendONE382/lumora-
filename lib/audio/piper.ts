import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

const PIPER_VOICE_DIR = process.env.PIPER_VOICE_DIR || path.join(process.cwd(), "tmp", "piper-voices");
const PIPER_MODEL = process.env.PIPER_MODEL || "en_US-amy-medium";
const PIPER_BINARY = process.env.PIPER_BINARY || "python";
const PIPER_SCRIPT = process.env.PIPER_SCRIPT || "-m";
const PIPER_MODULE = process.env.PIPER_MODULE || "piper";

export interface PiperResult {
  wavPath: string;
  duration: number;
}

export async function generateNarration(text: string, outputDir: string): Promise<PiperResult> {
  const modelPath = path.join(PIPER_VOICE_DIR, `${PIPER_MODEL}.onnx`);
  const configPath = path.join(PIPER_VOICE_DIR, `${PIPER_MODEL}.onnx.json`);

  if (!fs.existsSync(modelPath) || !fs.existsSync(configPath)) {
    throw new Error(`Piper voice model not found at ${PIPER_VOICE_DIR}/${PIPER_MODEL}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `narration-${Date.now()}.wav`);

  const args = [PIPER_SCRIPT, PIPER_MODULE, "--model", modelPath, "--config", configPath, "--output_file", outputPath];

  console.log("[piper] generating narration, length:", text.length);
  const startTime = Date.now();

  await new Promise<void>((resolve, reject) => {
    const child = execFile(PIPER_BINARY, args, (error, stdout, stderr) => {
      if (error) {
        console.error("[piper] synthesis failed:", error.message, stderr);
        return reject(new Error(`Piper synthesis failed: ${error.message}`));
      }
      resolve();
    });

    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    } else {
      reject(new Error("Piper process stdin is not available"));
    }
  });

  const durationMs = Date.now() - startTime;
  const stats = fs.statSync(outputPath);

  if (!stats.size || stats.size < 1000) {
    fs.rmSync(outputPath, { force: true });
    throw new Error("Piper produced an empty or invalid audio file");
  }

  console.log("[piper] audio created:", outputPath, "size:", stats.size, "duration:", `${durationMs}ms`);
  return { wavPath: outputPath, duration: stats.size };
}
