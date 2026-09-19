import https from "node:https";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || process.env.PEXELES_API_KEY;
const PEXELS_BASE_URL = "https://api.pexels.com";

if (!PEXELS_API_KEY) {
  console.warn("[pexels] PEXELS_API_KEY is not configured");
}

function request(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PEXELS_BASE_URL);
    const req = https.request(url, { method: "GET", headers: { Authorization: PEXELS_API_KEY || "" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`Pexels error ${res.statusCode}: ${body.toString()}`));
        }
        try {
          resolve(JSON.parse(body.toString()));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

export interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

export async function searchPexelsPhotos(query: string, perPage = 15): Promise<PexelsPhoto[]> {
  if (!PEXELS_API_KEY) throw new Error("Pexels API key missing");
  const encodedQuery = encodeURIComponent(query);
  const data = await request(`/v1/search?query=${encodedQuery}&per_page=${perPage}&orientation=portrait`);
  return data.photos || [];
}

export async function searchPexelsVideos(query: string, perPage = 15): Promise<PexelsVideo[]> {
  if (!PEXELS_API_KEY) throw new Error("Pexels API key missing");
  const encodedQuery = encodeURIComponent(query);
  const data = await request(`/videos/search?query=${encodedQuery}&per_page=${perPage}&orientation=portrait`);
  return data.videos || [];
}

export async function downloadPexelsFile(url: string, destPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET" }, (res) => {
      if (!res.statusCode || res.statusCode >= 400) {
        return reject(new Error(`Failed to download media: ${res.statusCode}`));
      }
      const fileStream = require("fs").createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve(destPath);
      });
      fileStream.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

function scorePhotoForScene(photo: PexelsPhoto, query: string): number {
  const queryLower = query.toLowerCase();
  const altLower = (photo.alt || "").toLowerCase();
  const photographerLower = (photo.photographer || "").toLowerCase();

  const queryTerms = queryLower.split(/[\s,]+/).filter(Boolean);
  const altTerms = altLower.split(/[\s,]+/).filter(Boolean);

  const exactMatches = queryTerms.filter((term) => altTerms.includes(term)).length;
  const aspectBonus = photo.width > photo.height ? 5 : 0;
  const resolutionBonus = Math.min(photo.width, photo.height) >= 2000 ? 10 : 0;

  return exactMatches * 20 + aspectBonus + resolutionBonus;
}

export function selectBestPhoto(photos: PexelsPhoto[], query: string): PexelsPhoto | null {
  if (!photos.length) return null;
  const ranked = photos
    .map((photo) => ({ photo, score: scorePhotoForScene(photo, query) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].photo;
}

function scoreVideoForScene(video: PexelsVideo, query: string): number {
  const queryLower = query.toLowerCase();
  const altLower = (video.url || "").toLowerCase();

  const queryTerms = queryLower.split(/[\s,]+/).filter(Boolean);
  const altTerms = altLower.split(/[\s,]+/).filter(Boolean);

  const exactMatches = queryTerms.filter((term) => altTerms.includes(term)).length;
  const aspectBonus = video.width > video.height ? 5 : 0;
  const durationBonus = video.duration >= 5 && video.duration <= 30 ? 10 : 0;

  return exactMatches * 20 + aspectBonus + durationBonus;
}

export function selectBestVideo(videos: PexelsVideo[], query: string): PexelsVideo | null {
  if (!videos.length) return null;
  const ranked = videos
    .map((video) => ({ video, score: scoreVideoForScene(video, query) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0].video;
}
