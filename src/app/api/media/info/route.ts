import { NextResponse } from "next/server";

import { detectPlatform } from "@/lib/platforms";
import { fetchMediaInfo } from "@/lib/yt-dlp";

export const runtime = "nodejs";

type InfoRequestBody = {
  url?: unknown;
};

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unable to fetch media information.";
  }

  if (
    /ENOENT|not recognized as an internal or external command/i.test(
      error.message,
    )
  ) {
    return "yt-dlp is not installed on the server. Install yt-dlp first.";
  }

  return error.message;
}

export async function POST(request: Request) {
  let body: InfoRequestBody;

  try {
    body = (await request.json()) as InfoRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";

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
          "Unsupported URL. Only YouTube, Facebook, TikTok, Instagram, and Twitter/X URLs are accepted.",
      },
      { status: 400 },
    );
  }

  try {
    const mediaInfo = await fetchMediaInfo(url);

    return NextResponse.json({
      platform,
      media: mediaInfo,
    });
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
