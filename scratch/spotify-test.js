async function test() {
  console.time("itunes");
  const urls = [
    "Let me down slowly Alec Benjamin",
    "Watermelon Sugar Harry Styles",
    "Blinding Lights The Weeknd",
    "Shape of You Ed Sheeran"
  ];
  
  const results = await Promise.all(urls.map(async (query) => {
     try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
        const json = await res.json();
        return json.results[0]?.artworkUrl100?.replace('100x100bb', '600x600bb');
     } catch (e) {
        return null;
     }
  }));
  
  console.timeEnd("itunes");
  console.log(results);
}
test();
