import pLimit from "p-limit";

// Restrict EC2 to exactly 5 concurrent yt-dlp binary executions globally.
// This prevents multiple users (or large playlists) from spawning 100+ instances 
// of ffmpeg/yt-dlp and crashing the backend server's CPU/RAM instantly.
export const dlLimit = pLimit(5);
