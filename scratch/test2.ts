import { downloadMedia } from "../src/lib/yt-dlp";
import { createWriteStream } from "fs";

async function main() {
  try {
    const result = await downloadMedia({
      url: "https://www.facebook.com/watch?v=1084374127208005",
      formatId: "1950203959037881v",
      audioOnly: false,
      isMuxed: false
    });
    console.log("Downloading...", result.fileName);
    const reader = result.stream.getReader();
    const ws = createWriteStream("test-output-fb.mp4");
    
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
