import { FetchMediaResult, MediaInfo, PlaylistInfo } from "./yt-dlp";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getSpotifyToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Spotify API keys are missing from the server environment.");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    throw new Error(`Spotify token fetch failed: ${res.statusText}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  // Expire 1 minute early to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken!;
}

export async function fetchSpotifyMedia(url: string): Promise<FetchMediaResult> {
  const token = await getSpotifyToken();

  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  const type = pathParts[0];
  const id = pathParts[1];

  if (!type || !id) {
    throw new Error("Invalid Spotify URL format.");
  }

  if (type === "track") {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch Spotify track.");
    const track = await res.json();
    
    // We map Spotify back to ytsearch1 for yt-dlp to download seamlessly!
    const searchString = `ytsearch1:${track.name} ${track.artists[0]?.name} audio`;
    
    const mediaInfo: MediaInfo = {
      title: `${track.artists[0]?.name ?? "Unknown"} - ${track.name}`,
      thumbnail: track.album?.images?.[0]?.url ?? null,
      durationSeconds: Math.floor((track.duration_ms ?? 0) / 1000),
      webpageUrl: searchString, // IMPORTANT: Used by yt-dlp to extract the video natively!
      videoFormats: [],
      audioFormats: [] // Dummy formats, real download skips extraction check usually if audio formats absent
    };
    return { type: "video", media: mediaInfo };
  }

  if (type === "playlist" || type === "album") {
    const isAlbum = type === "album";
    const res = await fetch(`https://api.spotify.com/v1/${isAlbum ? 'albums' : 'playlists'}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch Spotify ${type}.`);
    const data = await res.json();

    const playlistInfo: PlaylistInfo = {
      title: data.name,
      entries: []
    };

    if (!data.tracks || !data.tracks.items) {
      throw new Error("Cannot extract items. This Spotify playlist is either empty or private.");
    }

    const items = isAlbum ? data.tracks.items : data.tracks.items;
    
    for (let i = 0; i < items.length; i++) {
        const item = isAlbum ? items[i] : items[i].track;
        if (!item) continue;
        
        const searchString = `ytsearch1:${item.name} ${item.artists[0]?.name} audio`;
        const thumbnail = isAlbum ? data.images?.[0]?.url : item.album?.images?.[0]?.url;

        playlistInfo.entries.push({
            id: item.id,
            title: `${item.artists[0]?.name ?? "Unknown"} - ${item.name}`,
            durationSeconds: Math.floor((item.duration_ms ?? 0) / 1000),
            url: searchString, // Implicit mapping
            thumbnail: thumbnail ?? null
        });
    }

    return { type: "playlist", playlist: playlistInfo };
  }

  throw new Error("Unsupported Spotify link type. Only tracks, albums, and playlists are supported.");
}
