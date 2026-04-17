import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code, error } = req.query;

  console.log('Callback hit!');
  console.log('Code:', code);
  console.log('Error:', error);

  if (error) {
    return res.status(400).json({ error });
  }

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }).toString(),
    });

    const data = await response.json();
    console.log('Token response:', data);

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description });
    }

    const cookie = serialize('spotify_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.expires_in,
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    res.redirect('/');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
