import { parseCookies } from 'nookies';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parseCookies({ req });
  const spotifyToken = cookies.spotify_token;

  if (!spotifyToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  const { playlistName, description, tracks } = req.body;

  try {
    // Get user profile
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Spotify token expired' });
    }

    const user = await userRes.json();

    // Create playlist
    const playlistRes = await fetch(
      `https://api.spotify.com/v1/users/${user.id}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description,
          public: false,
        }),
      }
    );

    const playlist = await playlistRes.json();

    if (!playlistRes.ok) {
      return res.status(playlistRes.status).json({ error: playlist.error });
    }

    // Search and add tracks
    const trackUris = [];

    for (const track of tracks) {
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          `${track.title} ${track.artist}`
        )}&type=track&limit=1`,
        {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        }
      );

      const searchData = await searchRes.json();

      if (searchData.tracks.items.length > 0) {
        trackUris.push(searchData.tracks.items[0].uri);
      }
    }

    // Add tracks to playlist
    if (trackUris.length > 0) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: trackUris }),
      });
    }

    return res.status(200).json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
        tracksAdded: trackUris.length,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
