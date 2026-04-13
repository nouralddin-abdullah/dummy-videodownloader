import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SnapNest - Multi Platform Video Downloader",
    template: "%s | SnapNest",
  },
  description:
    "SnapNest is a premium video downloader for YouTube, Facebook, TikTok, Instagram, and X/Twitter. Save videos in true HD/MP4 or convert seamlessly to MP3 audio effortlessly.",
  keywords: [
    "video downloader",
    "youtube downloader",
    "facebook video downloader",
    "tiktok no watermark",
    "instagram reels downloader",
    "twitter video downloader",
    "mp4 to mp3 downloader",
    "SnapNest",
  ],
  authors: [{ name: "SnapNest" }],
  creator: "SnapNest",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "SnapNest - The Original Multi Platform Downloader",
    description:
      "Save your favorite videos safely! Support for YouTube, Facebook, TikTok, Instagram, and Twitter in up to HD or MP3 formats.",
    url: "https://example.com",
    siteName: "SnapNest Downloader",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapNest - Fast, Secure Multi-Platform Video Downloader",
    description:
      "A fast, modern web app to download high-quality videos and audios from popular social platforms.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
