export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { artist, title } = req.body;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title required' });
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(200).json({ imageUrl: null });
    }

    // Get access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      return res.status(200).json({ imageUrl: null });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Search for track
    const searchQuery = encodeURIComponent(`${title} ${artist}`);
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchRes.ok) {
      return res.status(200).json({ imageUrl: null });
    }

    const data = await searchRes.json();
    const track = data.tracks?.items?.[0];
    const imageUrl = track?.album?.images?.[0]?.url || null;

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Spotify search error:', error);
    return res.status(200).json({ imageUrl: null });
  }
}
