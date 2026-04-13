const spotifyUrlInfo = require('spotify-url-info')(fetch);

async function test() {
  try {
     const url = "https://open.spotify.com/playlist/75S9M2Yq7G1qdC4uzveEDI?si=93c91f31564b4e27&pt=82cb1213a25908fce81918b5183d227f";
     const tracks = await spotifyUrlInfo.getTracks(url);
     console.log("Track keys:", Object.keys(tracks[0]));
     console.log("Track:", tracks[0]);
  } catch (e) {
     console.error("Private failed:", e.message);
  }
}
test();
