export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artist, title } = req.body;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title required' });
  }

  try {
    const token = process.env.SPOTIFY_API_TOKEN;
    if (!token) {
      console.warn('SPOTIFY_API_TOKEN not set, returning null');
      return res.status(200).json({ imageUrl: null });
    }

    const searchQuery = encodeURIComponent(`${title} ${artist}`);
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.warn(`Spotify search failed: ${response.status}`);
      return res.status(200).json({ imageUrl: null });
    }

    const data = await response.json();
    const track = data.tracks?.items?.[0];
    const imageUrl = track?.album?.images?.[0]?.url || null;

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Spotify search error:', error);
    return res.status(200).json({ imageUrl: null });
  }
}
