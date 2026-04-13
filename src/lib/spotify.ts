import { FetchMediaResult, MediaInfo, PlaylistInfo, PlaylistItem } from "./yt-dlp";

// We use the node-native fetch which Next.js polyfills perfectly.
// Required via require() since the package is a pure CommonJS module exposing a function natively.
const spotifyUrlInfoPkg = require("spotify-url-info");
const spotifyUrlInfo = spotifyUrlInfoPkg(fetch);

export async function fetchSpotifyMedia(url: string): Promise<FetchMediaResult> {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  const type = pathParts[0];

  if (!type) {
    throw new Error("Invalid Spotify URL format.");
  }

  try {
    const data = await spotifyUrlInfo.getData(url);
    
    if (type === "track") {
       const artist = data.artists?.[0]?.name || data.subtitle || "Unknown Artist";
       const searchString = `ytsearch1:${data.name} ${artist} audio`;
       const mediaInfo: MediaInfo = {
          title: `${artist} - ${data.name}`,
          thumbnail: data.coverArt?.sources?.[0]?.url || data.images?.[0]?.url || null,
          durationSeconds: Math.floor((data.maxDuration || data.duration || 0) / 1000),
          webpageUrl: searchString, // Implicit yt-dlp mapping
          videoFormats: [],
          audioFormats: [] 
       };
       return { type: "video", media: mediaInfo };
    }

    if (type === "playlist" || type === "album") {
       const tracksData = await spotifyUrlInfo.getTracks(url);

       const playlistInfo: PlaylistInfo = {
          title: data.name || data.title,
          entries: []
       };

       const playlistDefaultImage = data.coverArt?.sources?.[0]?.url || data.images?.[0]?.url || null;

       const entriesPromises = tracksData.map(async (item: any) => {
          if (!item) return null;
          
          const artist = item.artist || "Unknown Artist";
          const trackTitle = item.name || item.title;
          const searchString = `ytsearch1:${trackTitle} ${artist} audio`;
          
          let trackThumb = playlistDefaultImage;
          try {
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout maximum to protect user UX
             
             const itunesQuery = encodeURIComponent(`${trackTitle} ${artist}`);
             const res = await fetch(`https://itunes.apple.com/search?term=${itunesQuery}&entity=song&limit=1`, {
                 signal: controller.signal,
                 // Cache tightly to avoid hammering
                 next: { revalidate: 3600 }
             });
             clearTimeout(timeoutId);
             
             if (res.ok) {
                 const json = await res.json();
                 if (json.results && json.results[0] && json.results[0].artworkUrl100) {
                     trackThumb = json.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
                 }
             }
          } catch (e) {
             // Fallback implicitly
          }
          
          return {
             id: item.id || item.uri || searchString,
             title: `${artist} - ${trackTitle}`,
             durationSeconds: Math.floor((item.duration || 0) / 1000),
             url: searchString,
             thumbnail: trackThumb
          };
       });

       const resolvedEntries = await Promise.all(entriesPromises);
       playlistInfo.entries = resolvedEntries.filter((e): e is PlaylistItem => e !== null);

       return { type: "playlist", playlist: playlistInfo };
    }

    throw new Error("Unsupported Spotify link type. Only tracks, albums, and playlists are supported.");
  } catch (error) {
     throw new Error("Cannot extract items. This Spotify link is either broken or too heavily restricted.");
  }
}
