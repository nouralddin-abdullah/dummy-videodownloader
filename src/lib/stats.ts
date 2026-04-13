import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STATS_FILE = resolve(process.cwd(), ".stats.json");

export function getStats(): { downloads: number } {
  try {
    const raw = readFileSync(STATS_FILE, "utf-8");
    return JSON.parse(raw) as { downloads: number };
  } catch {
    return { downloads: 0 };
  }
}

export function incrementDownloads(): void {
  try {
    const stats = getStats();
    stats.downloads += 1;
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf-8");
  } catch (error) {
    // Ignore permissions/disk errors so it doesn't break downloads
    console.error("Failed to update stats:", error);
  }
}
