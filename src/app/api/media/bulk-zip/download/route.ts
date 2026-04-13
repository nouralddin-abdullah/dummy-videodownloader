import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { tmpdir } from "os";
import * as fs from "fs";
import { stat } from "fs/promises";

// Safe, static IDM-compatible download endpoint that correctly broadcasts exact File Size.
// Handles HTTP Range requests naturally based on static file streams.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id || !/^[0-9a-fA-F-]+$/.test(id)) {
      return new Response("Invalid ID", { status: 400 });
    }

    const sessionDir = join(tmpdir(), `snapnest_zip_${id}`);
    const zipFilePath = join(sessionDir, `playlist.zip`);

    try {
      const fileStat = await stat(zipFilePath);
      const stream = fs.createReadStream(zipFilePath);

      // Converts Node stream gracefully into Next.js edge stream natively
      const readableWebStream = new ReadableStream({
        start(controller) {
          let isClosed = false;

          const safeClose = () => {
            if (isClosed) return;
            isClosed = true;
            try { controller.close(); } catch {}
          };
          
          const safeError = (err: any) => {
            if (isClosed) return;
            isClosed = true;
            try { controller.error(err); } catch {}
          };

          stream.on("data", (chunk) => {
            if (isClosed) return;
            try {
              controller.enqueue(chunk);
            } catch (e) {
              isClosed = true;
              stream.destroy();
            }
          });
          stream.on("end", safeClose);
          stream.on("error", safeError);
          
          req.signal.addEventListener("abort", () => {
             isClosed = true;
             stream.destroy();
          });
        },
      });

      return new Response(readableWebStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="SnapNest_Playlist.zip"`,
          "Content-Length": fileStat.size.toString(),
          "Accept-Ranges": "bytes", // Signals aggressive download managers like IDM that they can pull dynamically
        },
      });
    } catch {
      return new Response("ZIP file not found or has expired.", { status: 404 });
    }
  } catch (error) {
    console.error("Download Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
