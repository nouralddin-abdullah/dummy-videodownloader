import { downloadMedia } from "../src/lib/yt-dlp";
import { createWriteStream } from "fs";

async function main() {
  try {
    const result = await downloadMedia({
      url: "https://youtu.be/rHLAz3WbkD0?si=9byngNSgLyhKtlS4",
      formatId: "136",
      audioOnly: false,
      isMuxed: false
    });
    console.log("Downloading...", result.fileName);
    const reader = result.stream.getReader();
    const ws = createWriteStream("test-output.mp4");
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ws.write(value);
    }
    ws.end();
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
}
main();
