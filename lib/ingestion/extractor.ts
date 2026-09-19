export async function extractUrlContent(url: string): Promise<{
  title: string;
  description: string;
  content: string;
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  );
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  const cleanedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const content = cleanedHtml.slice(0, 5000);

  return { title, description, content };
}

export async function extractTextContent(text: string): Promise<{
  title: string;
  description: string;
  content: string;
}> {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const title = lines[0]?.trim() || "Untitled";
  const description = lines.slice(1, 3).join(" ").trim();
  const content = text;

  return { title, description, content };
}
