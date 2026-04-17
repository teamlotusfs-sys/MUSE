export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Return a test playlist (no API needed)
  return res.status(200).json({
    playlistName: "Test Playlist",
    description: "A test: " + prompt,
    tracks: [
      { title: "Song 1", artist: "Artist 1" },
      { title: "Song 2", artist: "Artist 2" },
      { title: "Song 3", artist: "Artist 3" },
      { title: "Song 4", artist: "Artist 4" },
      { title: "Song 5", artist: "Artist 5" },
    ]
  });
}
