import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lumora AI — Turn ideas into videos",
    template: "%s | Lumora AI",
  },
  description:
    "Lumora AI is a creative studio that turns a website, product, or plain idea into a finished vertical video — script, visuals, narration, captions and background music.",
  keywords: [
    "AI video generator",
    "text to video",
    "vertical video",
    "AI creative studio",
    "auto subtitles",
    "product ads",
  ],
  authors: [{ name: "Lumora AI" }],
  openGraph: {
    type: "website",
    siteName: "Lumora AI",
    title: "Lumora AI — Turn ideas into videos",
    description:
      "Give Lumora a website, product, or idea and it creates a finished 9:16 video with narration, captions and music.",
    images: ["/demo/example.mp4"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumora AI — Turn ideas into videos",
    description:
      "Give Lumora a website, product, or idea and it creates a finished 9:16 video with narration, captions and music.",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
