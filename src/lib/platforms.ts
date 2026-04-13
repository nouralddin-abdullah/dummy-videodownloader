export type PlatformId =
  | "youtube"
  | "facebook"
  | "tiktok"
  | "instagram"
  | "twitter";

export type Platform = {
  id: PlatformId;
  name: string;
  hosts: string[];
};

export const SUPPORTED_PLATFORMS: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    hosts: ["youtube.com", "youtu.be"],
  },
  {
    id: "facebook",
    name: "Facebook",
    hosts: ["facebook.com", "fb.watch"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    hosts: ["tiktok.com"],
  },
  {
    id: "instagram",
    name: "Instagram",
    hosts: ["instagram.com"],
  },
  {
    id: "twitter",
    name: "Twitter / X",
    hosts: ["twitter.com", "x.com"],
  },
];

function hostMatches(hostname: string, supportedHost: string): boolean {
  return hostname === supportedHost || hostname.endsWith(`.${supportedHost}`);
}

export function detectPlatform(videoUrl: string): Platform | null {
  let parsed: URL;

  try {
    parsed = new URL(videoUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  for (const platform of SUPPORTED_PLATFORMS) {
    if (platform.hosts.some((host) => hostMatches(hostname, host))) {
      return platform;
    }
  }

  return null;
}
