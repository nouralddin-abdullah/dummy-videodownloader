/**
 * Downloads the yt-dlp static Linux binary into <project>/bin/.
 *
 * Runs automatically via the "postinstall" npm script so that:
 *  - On Vercel (Linux): the binary is downloaded during `npm install`.
 *  - On Windows/macOS (local dev): the script is skipped – the system-
 *    installed yt-dlp is used instead.
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";

const BIN_DIR = join(process.cwd(), "bin");
const YT_DLP_PATH = join(BIN_DIR, "yt-dlp");
const DOWNLOAD_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";

async function main() {
  if (process.platform !== "linux") {
    console.log(
      "[setup-yt-dlp] Skipping download (not Linux). Use system yt-dlp for local dev.",
    );
    return;
  }

  if (existsSync(YT_DLP_PATH)) {
    console.log("[setup-yt-dlp] Binary already exists at", YT_DLP_PATH);
    chmodSync(YT_DLP_PATH, 0o755);
    return;
  }

  console.log("[setup-yt-dlp] Downloading yt-dlp static binary...");

  if (!existsSync(BIN_DIR)) {
    mkdirSync(BIN_DIR, { recursive: true });
  }

  const response = await fetch(DOWNLOAD_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(YT_DLP_PATH, buffer);
  chmodSync(YT_DLP_PATH, 0o755);

  console.log("[setup-yt-dlp] yt-dlp downloaded and made executable.");
}

main().catch((error) => {
  console.error("[setup-yt-dlp] Error:", error.message);
  process.exit(1);
});
