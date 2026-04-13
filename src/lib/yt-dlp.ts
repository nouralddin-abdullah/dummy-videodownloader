import { execFile, spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { chmod, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { Readable } from "node:stream";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXEC_BUFFER_SIZE = 24 * 1024 * 1024;

type YtDlpInvocation = {
  command: string;
  prefixArgs: string[];
};

let ytDlpInvocationPromise: Promise<YtDlpInvocation> | null = null;

export type MediaFormat = {
  formatId: string;
  ext: string;
  qualityLabel: string;
  sizeLabel: string | null;
  bytes: number | null;
  height: number | null;
  fps: number | null;
  audioBitrate: number | null;
  /** true = video+audio already muxed (no ffmpeg merge needed on download) */
  isMuxed: boolean;
};

export type MediaInfo = {
  title: string;
  thumbnail: string | null;
  durationSeconds: number | null;
  webpageUrl: string;
  videoFormats: MediaFormat[];
  audioFormats: MediaFormat[];
};

export type PlaylistItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  url: string;
  thumbnail: string | null;
};

export type PlaylistInfo = {
  title: string;
  entries: PlaylistItem[];
};

export type FetchMediaResult = 
  | { type: "video"; media: MediaInfo }
  | { type: "playlist"; playlist: PlaylistInfo };

type DownloadRequest = {
  url: string;
  formatId?: string;
  audioOnly: boolean;
  audioFormat?: "mp3" | "wav";
  /** mirrors MediaFormat.isMuxed — tells the downloader whether to add +bestaudio */
  isMuxed?: boolean;
};

export type DownloadPayload = {
  fileName: string;
  contentType: string;
  fileSize: number | null;
  stream: ReadableStream;
};

// ---------------------------------------------------------------------------
// yt-dlp invocation resolution
// ---------------------------------------------------------------------------

async function canRunCommand(
  command: string,
  args: string[],
): Promise<boolean> {
  try {
    await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 12000,
      maxBuffer: EXEC_BUFFER_SIZE,
    });
    return true;
  } catch {
    return false;
  }
}

async function resolveYtDlpInvocation(): Promise<YtDlpInvocation> {
  // Check for bundled static binary first (production / Vercel / EC2).
  // The binary is downloaded by scripts/setup-yt-dlp.mjs on Linux.
  const bundledPath = resolve(process.cwd(), "bin", "yt-dlp");
  try {
    await chmod(bundledPath, 0o755);
    if (await canRunCommand(bundledPath, ["--version"])) {
      return { command: bundledPath, prefixArgs: [] };
    }
  } catch {
    // Bundled binary not available – fall through to system installations.
  }

  if (await canRunCommand("yt-dlp", ["--version"])) {
    return { command: "yt-dlp", prefixArgs: [] };
  }

  if (await canRunCommand("py", ["-m", "yt_dlp", "--version"])) {
    return { command: "py", prefixArgs: ["-m", "yt_dlp"] };
  }

  if (await canRunCommand("python", ["-m", "yt_dlp", "--version"])) {
    return { command: "python", prefixArgs: ["-m", "yt_dlp"] };
  }

  if (await canRunCommand("python3", ["-m", "yt_dlp", "--version"])) {
    return { command: "python3", prefixArgs: ["-m", "yt_dlp"] };
  }

  throw new Error(
    "yt-dlp is not installed on the server. Install yt-dlp first.",
  );
}

async function getYtDlpInvocation(): Promise<YtDlpInvocation> {
  if (!ytDlpInvocationPromise) {
    ytDlpInvocationPromise = resolveYtDlpInvocation();
  }
  return ytDlpInvocationPromise;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | null): string | null {
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) {
    return null;
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatQualityLabel(
  rawFormat: Record<string, unknown>,
  hasVideo: boolean,
): string {
  const note =
    typeof rawFormat.format_note === "string" ? rawFormat.format_note : "";

  if (hasVideo) {
    const height =
      typeof rawFormat.height === "number" ? rawFormat.height : null;
    const fps = typeof rawFormat.fps === "number" ? rawFormat.fps : null;

    if (height) {
      return `${height}p${fps ? ` ${Math.round(fps)}fps` : ""}`;
    }

    const resolution =
      typeof rawFormat.resolution === "string" ? rawFormat.resolution : "";

    return resolution || note || "Video";
  }

  const abr =
    typeof rawFormat.abr === "number" ? Math.round(rawFormat.abr) : null;
  if (abr) {
    return `${abr} kbps`;
  }

  return note || "Audio";
}

/**
 * Returns true when `candidate` is a better pick than `current` for the same
 * resolution slot.  Priority: muxed > h264 > vp9 > other, then larger file.
 */
function isBetterVideoFormat(
  candidate: { isMuxed: boolean; vcodec: string; bytes: number | null },
  current: { isMuxed: boolean; vcodec: string; bytes: number | null },
): boolean {
  // Prefer muxed (no merge needed – no ffmpeg dependency at download time)
  if (candidate.isMuxed && !current.isMuxed) return true;
  if (!candidate.isMuxed && current.isMuxed) return false;

  // Prefer H.264 – widest device/browser compatibility
  const cH264 = /avc|h264/i.test(candidate.vcodec);
  const eH264 = /avc|h264/i.test(current.vcodec);
  if (cH264 && !eH264) return true;
  if (!cH264 && eH264) return false;

  // Prefer VP9 over AV1 (better compatibility at this point in time)
  const cVP9 = /vp9|vp09/i.test(candidate.vcodec);
  const eVP9 = /vp9|vp09/i.test(current.vcodec);
  if (cVP9 && !eVP9) return true;
  if (!cVP9 && eVP9) return false;

  // Same codec tier – prefer higher bitrate / larger file
  return (candidate.bytes ?? 0) > (current.bytes ?? 0);
}

// ---------------------------------------------------------------------------
// extractFormats – ONE entry per resolution, all platforms supported
// ---------------------------------------------------------------------------

function extractFormats(
  rawFormats: unknown[],
  durationSeconds: number | null,
): {
  videoFormats: MediaFormat[];
  audioFormats: MediaFormat[];
} {
  type Candidate = MediaFormat & { vcodec: string };

  // Key: height (px).  Value: best format seen so far for that height.
  const videoByHeight = new Map<number, Candidate>();
  const audioFormats: MediaFormat[] = [];

  for (const entry of rawFormats) {
    if (!entry || typeof entry !== "object") continue;

    const raw = entry as Record<string, unknown>;
    const formatId =
      typeof raw.format_id === "string" ? raw.format_id.trim() : "";
    if (!formatId) continue;

    const vCodec =
      typeof raw.vcodec === "string" ? raw.vcodec.trim() : "none";
    const aCodec =
      typeof raw.acodec === "string" ? raw.acodec.trim() : "none";
    const hasVideo = vCodec !== "none";
    const hasAudio = aCodec !== "none";

    if (!hasVideo && !hasAudio) continue;

    let bytes =
      typeof raw.filesize === "number"
        ? raw.filesize
        : typeof raw.filesize_approx === "number"
          ? raw.filesize_approx
          : null;

    if (bytes === null && durationSeconds) {
      const tbr = typeof raw.tbr === "number" ? raw.tbr : 0;
      const vbr = typeof raw.vbr === "number" ? raw.vbr : 0;
      const abr = typeof raw.abr === "number" ? raw.abr : 0;
      const bitrate = tbr > 0 ? tbr : vbr + abr;
      if (bitrate > 0) {
        bytes = (bitrate * 1000 * durationSeconds) / 8;
      }
    }

    const height = typeof raw.height === "number" ? raw.height : null;
    const fps = typeof raw.fps === "number" ? raw.fps : null;

    if (hasVideo) {
      // Skip storyboard / thumbnail formats
      if (/storyboard|mhtml/i.test(vCodec)) continue;

      const candidate: Candidate = {
        formatId,
        ext: typeof raw.ext === "string" ? raw.ext : "mp4",
        qualityLabel: formatQualityLabel(raw, true),
        sizeLabel: formatBytes(bytes),
        bytes,
        height,
        fps,
        audioBitrate: null,
        isMuxed: hasVideo && hasAudio,
        vcodec: vCodec,
      };

      // Group by height.  For formats without height, use 0 as the key.
      const key = height ?? 0;
      const existing = videoByHeight.get(key);

      if (!existing || isBetterVideoFormat(candidate, existing)) {
        videoByHeight.set(key, candidate);
      }
    } else if (hasAudio) {
      audioFormats.push({
        formatId,
        ext: typeof raw.ext === "string" ? raw.ext : "m4a",
        qualityLabel: formatQualityLabel(raw, false),
        sizeLabel: formatBytes(bytes),
        bytes,
        height: null,
        fps: null,
        audioBitrate: typeof raw.abr === "number" ? raw.abr : null,
        isMuxed: false,
      });
    }
  }

  // Strip the internal `vcodec` field before returning
  const videoFormats: MediaFormat[] = [...videoByHeight.values()]
    .filter((f) => f.height !== null || f.qualityLabel !== "Video") // remove unknown-height junk
    .map(({ vcodec: _vcodec, ...rest }) => rest);

  videoFormats.sort((a, b) => {
    const heightDelta = (b.height ?? 0) - (a.height ?? 0);
    if (heightDelta !== 0) return heightDelta;
    return (b.fps ?? 0) - (a.fps ?? 0);
  });

  audioFormats.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));

  return { videoFormats, audioFormats };
}

// ---------------------------------------------------------------------------
// Public API: fetch info
// ---------------------------------------------------------------------------

function getProxyUrl(): string | null {
  if (process.env.PROXY_ENABLED !== "true") return null;

  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT;
  const user = process.env.PROXY_USER;
  const pass = process.env.PROXY_PASS;

  if (!host || !port) return null;

  if (user && pass) {
    return `http://${user}:${pass}@${host}:${port}`;
  }
  return `http://${host}:${port}`;
}

export async function fetchMediaInfo(url: string): Promise<FetchMediaResult> {
  const ytDlp = await getYtDlpInvocation();

  const args = [
    ...ytDlp.prefixArgs,
    "--dump-single-json",
    "--flat-playlist",
    "--no-warnings",
  ];

  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  args.push("--", url);

  const { stdout } = await execFileAsync(
    ytDlp.command,
    args,
    {
      maxBuffer: EXEC_BUFFER_SIZE,
      windowsHide: true,
    },
  );

  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  const _type = typeof parsed._type === "string" ? parsed._type : "video";
  const title = typeof parsed.title === "string" ? parsed.title : "Untitled";

  if (_type === "playlist" || _type === "multi_video") {
    const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
    const entries: PlaylistItem[] = rawEntries.map((e) => {
      const record = e as Record<string, unknown>;
      const thumbnails = Array.isArray(record.thumbnails) ? record.thumbnails : [];
      let thumbnail: string | null = null;
      if (thumbnails.length > 0) {
        const lastThumb = thumbnails[thumbnails.length - 1] as Record<string, unknown>;
        if (typeof lastThumb.url === "string") {
          thumbnail = lastThumb.url;
        }
      }
      return {
        id: typeof record.id === "string" ? record.id : "",
        title: typeof record.title === "string" ? record.title : "Untitled",
        url: typeof record.url === "string" ? record.url : "",
        durationSeconds: typeof record.duration === "number" ? Math.round(record.duration) : null,
        thumbnail,
      };
    }).filter((e) => e.id || e.url);

    return {
      type: "playlist",
      playlist: {
        title,
        entries,
      },
    };
  }

  // Normal video parsing
  const rawFormats = Array.isArray(parsed.formats) ? parsed.formats : [];
  const durationSeconds =
    typeof parsed.duration === "number" ? Math.round(parsed.duration) : null;

  const { videoFormats, audioFormats } = extractFormats(
    rawFormats,
    durationSeconds,
  );

  return {
    type: "video",
    media: {
      title,
      thumbnail: typeof parsed.thumbnail === "string" ? parsed.thumbnail : null,
      durationSeconds,
      webpageUrl:
        typeof parsed.webpage_url === "string" ? parsed.webpage_url : url,
      videoFormats,
      audioFormats,
    },
  };
}

// ---------------------------------------------------------------------------
// Public API: download
// ---------------------------------------------------------------------------

function resolveContentType(fileName: string): string {
  const ext = extname(fileName).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".mp4":
      return "video/mp4";
    case ".m4a":
      return "audio/mp4";
    case ".webm":
      return "video/webm";
    case ".mkv":
      return "video/x-matroska";
    case ".aac":
      return "audio/aac";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[\r\n"]/g, "_");
}

async function runYtDlpDownload(
  tempDir: string,
  request: DownloadRequest,
): Promise<string> {
  const ytDlp = await getYtDlpInvocation();

  const outputTemplate = join(tempDir, "%(title).80s-%(id)s.%(ext)s");
  const args: string[] = [
    ...ytDlp.prefixArgs,
    "--no-playlist",
    "--restrict-filenames",
    "--no-warnings",
  ];

  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    args.push("--proxy", proxyUrl);
  }

  const ext = process.platform === "win32" ? ".exe" : "";
  const ffmpegPath = resolve(process.cwd(), "node_modules", "ffmpeg-static", `ffmpeg${ext}`);
  if (existsSync(ffmpegPath)) {
    args.push("--ffmpeg-location", ffmpegPath);
  }

  args.push("-o", outputTemplate);

  if (request.audioOnly) {
    // Download best (or selected) audio track and convert to MP3/WAV.
    // Requires ffmpeg on the server.
    args.push("-f", request.formatId || "bestaudio");
    args.push(
      "--extract-audio",
      "--audio-format",
      request.audioFormat || "mp3",
      "--audio-quality",
      "0",
    );
  } else if (request.formatId) {
    if (request.isMuxed) {
      // Already contains video + audio – download directly, no merge needed.
      args.push("-f", request.formatId);
    } else {
      // Video-only stream – merge with best available audio using ffmpeg.
      // Force AAC audio (m4a) to ensure playback compatibility in standard MP4 players.
      args.push(
        "-f",
        `${request.formatId}+bestaudio[ext=m4a]/${request.formatId}+bestaudio/${request.formatId}`,
        "--merge-output-format",
        "mp4",
      );
    }
  } else {
    args.push("-f", "bestvideo+bestaudio[ext=m4a]/bestvideo+bestaudio/best");
    args.push("--merge-output-format", "mp4");
  }

  args.push("--", request.url);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ytDlp.command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrOutput = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (stderrOutput) {
        console.log(`[yt-dlp stderr]:\n${stderrOutput}`);
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderrOutput || `yt-dlp exited with code ${code}`));
      }
    });
  });

  const files = await readdir(tempDir);
  const candidateFiles = files.filter(
    (f) => !f.endsWith(".part") && !f.endsWith(".ytdl"),
  );

  if (candidateFiles.length === 0) {
    throw new Error("Download completed but no output file was found.");
  }

  // If there are multiple files it usually indicates a failed FFmpeg merge format.
  // We should pick the correctly multiplexed one, or if it doesn't exist, fail loud.
  let outputFile = candidateFiles[0];
  if (candidateFiles.length > 1) {
    const intendedExt = request.audioOnly ? ".mp3" : ".mp4";
    const matched = candidateFiles.find((f) => f.endsWith(intendedExt));
    if (matched) {
      outputFile = matched;
    } else {
      throw new Error(
        "Downloader failed to merge streams (missing FFmpeg or codec issue).",
      );
    }
  }

  return join(tempDir, outputFile);
}

export async function downloadMedia(
  request: DownloadRequest,
): Promise<DownloadPayload> {
  const tempDir = await mkdtemp(join(tmpdir(), "snapnest-"));

  try {
    const filePath = await runYtDlpDownload(tempDir, request);
    const fileName = sanitizeFileName(
      filePath.split(/[/\\]/).pop() ?? "download.bin",
    );
    
    // Grab the exact file size for the Content-Length header to allow client tracking
    const fileStat = await stat(filePath).catch(() => null);
    const fileSize = fileStat?.size ?? null;
    
    const nodeStream = createReadStream(filePath);

    const cleanup = async () => {
      await rm(tempDir, { recursive: true, force: true });
    };

    nodeStream.once("close", () => void cleanup());
    nodeStream.once("error", () => void cleanup());

    return {
      fileName,
      contentType: resolveContentType(fileName),
      fileSize,
      stream: Readable.toWeb(nodeStream) as ReadableStream,
    };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}
