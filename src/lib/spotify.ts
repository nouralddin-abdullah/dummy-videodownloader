import { FetchMediaResult, MediaInfo, PlaylistInfo, PlaylistItem } from "./yt-dlp";
import spotifyUrlInfoPkg from "spotify-url-info";

// We use the node-native fetch which Next.js polyfills perfectly.
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

       for (const item of tracksData) {
          if (!item) continue;
          
          const artist = item.artist || "Unknown Artist";
          const trackTitle = item.name || item.title;
          const searchString = `ytsearch1:${trackTitle} ${artist} audio`;
          
          playlistInfo.entries.push({
             id: item.id || item.uri || searchString,
             title: `${artist} - ${trackTitle}`,
             durationSeconds: Math.floor((item.duration || 0) / 1000),
             url: searchString,
             thumbnail: data.coverArt?.sources?.[0]?.url || data.images?.[0]?.url || null
          });
       }
       return { type: "playlist", playlist: playlistInfo };
    }

    throw new Error("Unsupported Spotify link type. Only tracks, albums, and playlists are supported.");
  } catch (error) {
     throw new Error("Cannot extract items. This Spotify link is either broken or too heavily restricted.");
  }
}
