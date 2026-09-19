export async function generateTTS(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<Blob | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.warn("[audio] ELEVENLABS_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[audio] ElevenLabs TTS failed: ${response.status} ${error}`);
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.error("[audio] ElevenLabs TTS error:", error);
    return null;
  }
}

export async function generateTTSUrl(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM"
): Promise<string | null> {
  const blob = await generateTTS(text, voiceId);
  if (!blob) {
    return null;
  }
  return URL.createObjectURL(blob);
}
