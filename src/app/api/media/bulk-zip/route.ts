import { NextRequest } from "next/server";
import archiver from "archiver";
import { dlLimit } from "@/lib/queue";
import { downloadMedia } from "@/lib/yt-dlp";
import { Readable } from "stream";
import { incrementDownloads } from "@/lib/stats";
import { randomUUID } from "crypto";
import { join } from "path";
import { tmpdir } from "os";
import { mkdir, rm } from "fs/promises";
import * as fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request. Missing items." }), { status: 400 });
    }

    const sessionId = randomUUID();
    const sessionDir = join(tmpdir(), `snapnest_zip_${sessionId}`);
    await mkdir(sessionDir, { recursive: true });

    const zipFilePath = join(sessionDir, `playlist.zip`);
    const outputStream = fs.createWriteStream(zipFilePath);

    const archive = archiver("zip", {
      zlib: { level: 5 },
    });

    archive.pipe(outputStream);

    // We use a TransformStream to construct standard Server-Sent Events (SSE)
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const ping = async (data: any) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (e) {
         // Silently ignore write errors if client disconnected explicitly
      }
    };

    req.signal.addEventListener("abort", () => {
      archive.abort();
      rm(sessionDir, { recursive: true, force: true }).catch(() => {});
    });

    // Background Async Runner
    (async () => {
      let completed = 0;
      const total = items.length;

      try {
        await ping({ status: "processing", progress: 0, total });

        const tasks = items.map((item: any, index: number) => dlLimit(async () => {
           try {
               const dl = await downloadMedia({ ...item });
               const nodeStream = Readable.fromWeb(dl.stream as any);

               const cleanTitle = (item.title || "Unknown").replace(/[\\/:*?"<>|]/g, "_");
               const ext = dl.fileName.split('.').pop() || "mp3";
               
               archive.append(nodeStream, { name: `${cleanTitle}-${index}.${ext}` });

               await new Promise<void>((resolve, reject) => {
                   nodeStream.on("end", resolve);
                   nodeStream.on("error", reject);
               });

               incrementDownloads();
               completed++;
               await ping({ status: "processing", progress: completed, total });
           } catch (e) {
               console.error(`Failed to pack item ${item.title}:`, e);
               archive.append(`Failed to download ${item.title}: ${e instanceof Error ? e.message : e}`, { name: `ERROR-${index}.txt` });
           }
        }));

        await Promise.allSettled(tasks);

        await new Promise<void>((resolve, reject) => {
           outputStream.on("close", resolve);
           archive.on("error", reject);
           archive.finalize();
        });

        // 100% written to disk securely
        await ping({ status: "completed", fileId: sessionId });

      } catch (error) {
        console.error("Archive failure:", error);
        await ping({ status: "error", message: "Failed to construct the ZIP archive permanently." });
      } finally {
        try {
          await writer.close();
        } catch(e) {}
        
        // Setup autonomous cleanup schedule for 15 minutes globally
        setTimeout(() => {
          rm(sessionDir, { recursive: true, force: true }).catch(() => {});
        }, 15 * 60 * 1000);
      }
    })();

    // HTTP 200 with standard SSE headers specifically designed to prevent caching
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      },
    });

  } catch (error) {
    console.error("Bulk Zip Initialization Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
