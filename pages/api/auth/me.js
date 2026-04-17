export default async function handler(req, res) {
  try {
    // Get token from cookies
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/spotify_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user info from Spotify
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await response.json();
    res.status(200).json(user);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
