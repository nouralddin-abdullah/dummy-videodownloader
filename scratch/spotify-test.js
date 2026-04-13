async function test() {
  try {
    // Get guest token
    const tokenRes = await fetch("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
    });
    const tokenData = await tokenRes.json();
    console.log("Token:", tokenData.accessToken.substring(0, 20) + "...");

    // Query track
    const trackRes = await fetch("https://api.spotify.com/v1/tracks/1sPXYYedKz0fM5x8J8k82A", {
        headers: {
            "Authorization": "Bearer " + tokenData.accessToken
        }
    });
    const trackData = await trackRes.json();
    console.log("Track:", trackData.name, "-", trackData.artists[0].name);
    console.log("Image:", trackData.album.images[0].url);

    // Query playlist
    const plRes = await fetch("https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M?fields=name,images,tracks.items(track(name,artists,duration_ms,id))", {
        headers: {
            "Authorization": "Bearer " + tokenData.accessToken
        }
    });
    const plData = await plRes.json();
    console.log("Playlist:", plData.name);
    console.log("Size:", plData.tracks.items.length);

  } catch (e) {
    console.error(e);
  }
}
test();
