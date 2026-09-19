import { GoogleGenerativeAI, GenerativeModel, Part, SchemaType } from "@google/generative-ai";
import { CreativePlan, Scene } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const PLAN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    goal: { type: SchemaType.STRING },
    audience: { type: SchemaType.STRING },
    tone: { type: SchemaType.STRING },
    visualStyle: { type: SchemaType.STRING },
    duration: { type: SchemaType.NUMBER },
    aspectRatio: { type: SchemaType.STRING },
    concept: { type: SchemaType.STRING },
    script: { type: SchemaType.STRING },
      scenes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            duration: { type: SchemaType.NUMBER },
            narration: { type: SchemaType.STRING },
            visualDescription: { type: SchemaType.STRING },
            onScreenText: { type: SchemaType.STRING },
            searchQueries: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["id", "duration", "narration", "visualDescription", "onScreenText"],
        },
      },
  },
  required: ["title", "goal", "audience", "tone", "visualStyle", "duration", "aspectRatio", "concept", "script", "scenes"],
};

function buildFallbackPlan(url: string | undefined, text: string | undefined): CreativePlan {
  const topic = text || url || "your idea";
  const title = topic.length > 60 ? topic.slice(0, 57) + "..." : topic;

  const scenes: Scene[] = [
    {
      id: "scene_1",
      duration: 8,
      narration: `Introducing ${topic}. This is something special.`,
      visualDescription: `A cinematic opening shot representing ${topic}, dark moody lighting, professional aesthetic, 8k, highly detailed`,
      onScreenText: topic,
      searchQueries: [topic, "cinematic", "professional"],
    },
    {
      id: "scene_2",
      duration: 10,
      narration: "Discover the details that make it stand out from the rest.",
      visualDescription: "Detailed product or concept visualization, clean modern design, vibrant colors, professional studio lighting, 8k",
      onScreenText: "Discover More",
      searchQueries: ["product detail", "modern design", "studio lighting"],
    },
    {
      id: "scene_3",
      duration: 8,
      narration: "Crafted with precision. Designed for impact.",
      visualDescription: "Dynamic action shot, motion blur, energetic composition, premium feel, cinematic color grading, 8k",
      onScreenText: "Premium Quality",
      searchQueries: ["dynamic action", "motion blur", "premium"],
    },
    {
      id: "scene_4",
      duration: 7,
      narration: "The future is here. Be part of it.",
      visualDescription: "Forward-looking futuristic scene, glowing elements, inspiring atmosphere, wide cinematic frame, 8k",
      onScreenText: "The Future Is Now",
      searchQueries: ["futuristic", "inspiring", "cinematic"],
    },
  ];

  return {
    title,
    goal: "promotion",
    audience: "General audience interested in modern products and ideas",
    tone: "modern, energetic, premium",
    visualStyle: "cinematic, high-end, vibrant",
    duration: scenes.reduce((sum, s) => sum + s.duration, 0),
    aspectRatio: "9:16",
    concept: `A dynamic short-form video promoting ${topic}.`,
    script: scenes.map((s) => s.narration).join(" "),
    scenes,
  };
}

async function callGeminiWithTimeout(
  model: GenerativeModel,
  prompt: string,
  timeoutMs = 25000
): Promise<string> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs);
  });

  const apiPromise = model
    .generateContent(prompt)
    .then((result) => result.response.text())
    .catch((err) => {
      throw err;
    });

  return Promise.race([apiPromise, timeoutPromise]);
}

async function callGeminiWithStructuredOutput(
  model: GenerativeModel,
  prompt: string,
  timeoutMs = 25000
): Promise<any> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs);
  });

  const apiPromise = model
    .generateContent({
      contents: [{ role: "user", parts: [{ text: prompt } as Part] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: PLAN_SCHEMA,
      },
    })
    .then((result) => {
      const text = result.response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Gemini returned invalid structured JSON");
      }
    })
    .catch((err) => {
      throw err;
    });

  return Promise.race([apiPromise, timeoutPromise]);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: any): boolean {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("quota") ||
    message.includes("Rate limit")
  );
}

function extractRetryDelay(error: any): number {
  const message = typeof error?.message === "string" ? error.message : "";
  const match = message.match(/retry in (\d+\.?\d*)s/);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }
  }
  return 2000;
}

async function callGeminiWithRetry(
  model: GenerativeModel,
  prompt: string,
  timeoutMs = 25000,
  maxRetries = 2
): Promise<any> {
  let attempt = 0;
  let lastError: any;

  while (attempt <= maxRetries) {
    try {
      return await callGeminiWithStructuredOutput(model, prompt, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error)) {
        throw error;
      }
      if (attempt >= maxRetries) {
        break;
      }
      const delay = extractRetryDelay(error);
      console.warn(`[creative] Gemini rate limited, retrying in ${delay}ms...`);
      await sleep(delay);
      attempt++;
    }
  }

  throw lastError;
}

function extractJsonFromText(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function normalizePlan(parsed: any, fallback: CreativePlan): CreativePlan {
  const scenes = Array.isArray(parsed.scenes) && parsed.scenes.length > 0 ? parsed.scenes : fallback.scenes;
  const normalizedScenes = scenes.map((scene: any, index: number) => ({
    id: scene.id || `scene_${index + 1}`,
    duration: typeof scene.duration === "number" ? scene.duration : fallback.scenes[index]?.duration || 5,
    narration: typeof scene.narration === "string" ? scene.narration : fallback.scenes[index]?.narration || "",
    visualDescription: typeof scene.visualDescription === "string" ? scene.visualDescription : fallback.scenes[index]?.visualDescription || "",
    onScreenText: typeof scene.onScreenText === "string" ? scene.onScreenText : fallback.scenes[index]?.onScreenText || "",
    searchQueries: Array.isArray(scene.searchQueries) && scene.searchQueries.length > 0
      ? scene.searchQueries
      : [scene.visualDescription || fallback.scenes[index]?.visualDescription || "cinematic"].slice(0, 3),
  }));

  return {
    title: parsed.title || fallback.title,
    goal: parsed.goal || fallback.goal,
    audience: parsed.audience || fallback.audience,
    tone: parsed.tone || fallback.tone,
    visualStyle: parsed.visualStyle || fallback.visualStyle,
    duration: parsed.duration || normalizedScenes.reduce((sum: number, s: any) => sum + (typeof s.duration === "number" ? s.duration : 0), 0),
    aspectRatio: parsed.aspectRatio || fallback.aspectRatio,
    concept: parsed.concept || fallback.concept,
    script: parsed.script || fallback.script,
    scenes: normalizedScenes,
  };
}

export async function generateCreativePlan(
  url: string | undefined,
  text: string | undefined
): Promise<CreativePlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = buildFallbackPlan(url, text);

  if (!apiKey || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY not set, using fallback plan");
    return fallback;
  }

  try {
    console.log("[creative] request started:", { url, text: text?.slice(0, 50) });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const context = [url, text].filter(Boolean).join("\n") || "No specific input provided";

    const prompt = `You are Lumora AI, a creative video director.

User input: ${context}

Create a structured video creative plan matching this schema exactly.

Rules:
- 4-6 scenes
- 5-12 seconds each
- Total 25-50 seconds
- Vertical 9:16
- Visual descriptions must be detailed and suitable for stock media search
- On-screen text short and punchy
- Narration natural and conversational
- For each scene, provide 1-3 searchQueries that would help find relevant real photos or videos on Pexels. Make these specific and descriptive.`;

    console.log("[creative] Gemini request sent");
    let parsed;
    try {
      parsed = await callGeminiWithRetry(model, prompt, 25000, 2);
    } catch (error) {
      console.error("[creative] Gemini API error:", error);
      console.warn("[creative] Falling back to local plan due to API error");
      return fallback;
    }
    console.log("[creative] Gemini response received, parsed structured output");

    const plan = normalizePlan(parsed, fallback);
    console.log("[creative] blueprint validated:", plan.title, "scenes:", plan.scenes.length);
    return plan;
  } catch (error) {
    console.error("[creative] Gemini API error:", error);
    throw error;
  }
}

export async function reviseCreativePlan(
  existingPlan: CreativePlan,
  feedback: string
): Promise<CreativePlan> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.warn("GEMINI_API_KEY not set, returning existing plan for revision");
    return { ...existingPlan };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are Lumora AI. Revise this video plan based on user feedback.

CURRENT PLAN:
Title: ${existingPlan.title}
Goal: ${existingPlan.goal}
Tone: ${existingPlan.tone}
Visual Style: ${existingPlan.visualStyle}
Concept: ${existingPlan.concept}
Script: ${existingPlan.script}

Scenes:
${existingPlan.scenes.map((s, i) => `${i + 1}. [${s.duration}s] ${s.visualDescription} | ${s.narration} | ${s.onScreenText}`).join("\n")}

USER FEEDBACK: ${feedback}

Return ONLY a JSON object with the same schema as the current plan. Do not include any text outside the JSON.`;

    const textResponse = await callGeminiWithTimeout(model, prompt, 25000);

    const parsed = extractJsonFromText(textResponse);
    if (!parsed) {
      return { ...existingPlan };
    }

    return normalizePlan(parsed, existingPlan);
  } catch (error) {
    console.error("Gemini revision error:", error);
    return { ...existingPlan };
  }
}
