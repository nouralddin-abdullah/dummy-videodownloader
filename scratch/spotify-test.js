async function test() {
  const url = "https://open.spotify.com/playlist/75S9M2Yq7G1qdC4uzveEDI?si=93c91f31564b4e27&pt=82cb1213a25908fce81918b5183d227f";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
  });
  
  const text = await res.text();
  console.log("HTML length:", text.length);
  
  // Find any track names
  if (text.includes("Let Me Down Slowly")) {
     console.log("Found playlist title!");
  }
}
test();
