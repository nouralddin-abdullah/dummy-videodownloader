import { NextRequest } from "next/server";
import archiver from "archiver";
import { dlLimit } from "@/lib/queue";
import { downloadMedia } from "@/lib/yt-dlp";
import { Readable } from "stream";

// This endpoint streams a cleanly padded .zip buffer automatically without consuming heavy RAM
export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response("Invalid request. Missing items.", { status: 400 });
    }

    const archive = archiver("zip", {
      zlib: { level: 5 }, // Good compression/speed balance
    });

    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk) => controller.enqueue(chunk));
        archive.on("end", () => controller.close());
        archive.on("error", (err) => controller.error(err));

        // Wrap execution in an IIFE to not block the 'start' return
        (async () => {
          try {
            // Because archiver.append() does not natively block the loop, if we launched 
            // all of these sequentially it would cause yt-dlp to download all 50 tracks
            // concurrently into /tmp/ and bloat the drive.
            // Using a `for...of` loop with `dlLimit` ensures we only execute exactly 
            // 3 intensive yt-dlp extractions globally at a time, ensuring absolute server stability.
            const tasks = items.map((item, index) => dlLimit(async () => {
               try {
                   const reqObj = { ...item };
                   const dl = await downloadMedia(reqObj);
                   const nodeStream = Readable.fromWeb(dl.stream as any);

                   // We must await the nodeStream to finish closing before releasing the dlLimit lock
                   // so that yt-dlp has safely purged the internal /tmp/ file it used.
                   // Notice we give each a safe name
                   const cleanTitle = (item.title || "Unknown").replace(/[\\/:*?"<>|]/g, "_");
                   // extract ext safely
                   const ext = dl.fileName.split('.').pop() || "mp3";
                   
                   archive.append(nodeStream, { name: `${cleanTitle}-${index}.${ext}` });

                   await new Promise<void>((resolve, reject) => {
                       nodeStream.on("end", resolve);
                       nodeStream.on("error", reject);
                   });
               } catch (e) {
                   console.error(`Failed to pack item ${item.title}:`, e);
                   // Create an ERROR.txt securely inside the zip for transparency instead of crashing the whole zip
                   archive.append(`Failed to download ${item.title}: ${e instanceof Error ? e.message : e}`, { name: `ERROR-${index}.txt` });
               }
            }));

            await Promise.allSettled(tasks);

          } finally {
            // Signal the archiver that no more files will be appended
            archive.finalize();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Disposition": `attachment; filename="SnapNest_Playlist.zip"`,
        "Content-Type": "application/zip",
      },
    });
  } catch (error) {
    console.error("Bulk Zip Initialization Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
