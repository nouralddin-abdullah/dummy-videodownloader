import { NextResponse } from "next/server";

import { detectPlatform } from "@/lib/platforms";
import { downloadMedia } from "@/lib/yt-dlp";
import { incrementDownloads } from "@/lib/stats";
import { fetchSpotifyMedia } from "@/lib/spotify";

export const runtime = "nodejs";

type DownloadRequestBody = {
  url?: unknown;
  formatId?: unknown;
  audioOnly?: unknown;
  audioFormat?: unknown;
  isMuxed?: unknown;
  title?: unknown;
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unable to download this media.";
  }

  if (
    /ENOENT|not recognized as an internal or external command/i.test(
      error.message,
    )
  ) {
    return "yt-dlp is not installed on the server. Install yt-dlp first.";
  }

  if (/ffmpeg/i.test(error.message)) {
    return "FFmpeg is required to merge video and audio. Install FFmpeg on the server and try again.";
  }

  return error.message;
}

export async function POST(request: Request) {
  let body: DownloadRequestBody;

  try {
    body = (await request.json()) as DownloadRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const formatId =
    typeof body.formatId === "string" && body.formatId.trim()
      ? body.formatId.trim()
      : undefined;
  const audioFormat = 
    typeof body.audioFormat === "string" && (body.audioFormat === "mp3" || body.audioFormat === "wav")
      ? body.audioFormat
      : "mp3";
  const audioOnly = body.audioOnly === true;
  const isMuxed = body.isMuxed === true;
  const customTitle = typeof body.title === "string" ? body.title.trim() : "";

  if (!url) {
    return NextResponse.json(
      { message: "Video URL is required." },
      { status: 400 },
    );
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return NextResponse.json(
      {
        message:
          "Unsupported URL. Only Spotify, YouTube, Facebook, TikTok, Instagram, and Twitter/X URLs are accepted.",
      },
      { status: 400 },
    );
  }

  let activeUrl = url;

  if (platform.id === "spotify") {
    // Dynamically bridge Spotify downloads in the backend if triggered without frontend info context.
    const spotifyData = await fetchSpotifyMedia(url);
    if (spotifyData.type === "video") {
      activeUrl = spotifyData.media.webpageUrl;
    } else {
      return NextResponse.json({ message: "Cannot bulk download a playlist indirectly. Extract via /info first." }, { status: 400 });
    }
  }

  try {
    const payload = await downloadMedia({
      url: activeUrl,
      formatId,
      audioOnly,
      audioFormat,
      isMuxed,
    });

    // Record the successful download locally, safely
    incrementDownloads();

    const finalFileName = customTitle 
       ? `${customTitle.replace(/[\\/:*?"<>|]/g, "_")}.${payload.fileName.split('.').pop()}` 
       : payload.fileName;

    const headers: HeadersInit = {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
      "Cache-Control": "no-store",
    };

    if (payload.fileSize !== null) {
      headers["Content-Length"] = payload.fileSize.toString();
    }

    return new Response(payload.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
