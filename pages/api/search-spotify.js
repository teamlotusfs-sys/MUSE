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
      console.warn('Spotify credentials not configured');
      return res.status(200).json({ imageUrl: null, previewUrl: null, spotifyUrl: null });
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
      console.error('Failed to get Spotify token');
      return res.status(200).json({ imageUrl: null, previewUrl: null, spotifyUrl: null });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Try exact search first
    let searchQuery = encodeURIComponent(`track:"${title}" artist:"${artist}"`);
    let searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=5`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!searchRes.ok) {
      return res.status(200).json({ imageUrl: null, previewUrl: null, spotifyUrl: null });
    }

    let data = await searchRes.json();
    let track = data.tracks?.items?.[0];

    // If no exact match, try looser search
    if (!track) {
      searchQuery = encodeURIComponent(`${title}`);
      searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`,
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (searchRes.ok) {
        data = await searchRes.json();
        track = data.tracks?.items?.[0];
      }
    }

    if (track) {
      return res.status(200).json({
        imageUrl: track.album?.images?.[0]?.url || null,
        previewUrl: track.preview_url || null,
        spotifyUrl: track.external_urls?.spotify || null,
      });
    }

    return res.status(200).json({ imageUrl: null, previewUrl: null, spotifyUrl: null });

  } catch (error) {
    console.error('Spotify search error:', error);
    return res.status(200).json({ imageUrl: null, previewUrl: null, spotifyUrl: null });
  }
}
