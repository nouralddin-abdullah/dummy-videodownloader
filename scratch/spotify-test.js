async function test() {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '609abb4a69b7468486c6d009518b7779';
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'a150e897d33d47058445325057266cca';
  
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
    },
    body: "grant_type=client_credentials"
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  
  const res = await fetch(`https://api.spotify.com/v1/playlists/75S9M2Yq7G1qdC4uzveEDI?fields=name,images,tracks.items(track)`, {
      headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await res.json();
  console.log("data keys:", Object.keys(data));
  if (data.tracks) console.log("Items size:", data.tracks.items.length);
  else console.log(data);
}
test();
