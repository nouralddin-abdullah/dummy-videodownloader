const spotifyUrlInfo = require('spotify-url-info')(fetch);

async function test() {
  try {
     const url = "https://open.spotify.com/playlist/75S9M2Yq7G1qdC4uzveEDI?si=93c91f31564b4e27&pt=82cb1213a25908fce81918b5183d227f";
     const data = await spotifyUrlInfo.getData(url);
     console.log("Data keys:", Object.keys(data));
     if (data.trackList) {
         console.log("Data Tracklist:", data.trackList[0]);
     }
  } catch (e) {
     console.error("Private failed:", e.message);
  }
}
test();
