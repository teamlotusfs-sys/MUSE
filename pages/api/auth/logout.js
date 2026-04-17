import { serialize } from 'cookie';

export default function handler(req, res) {
  const cookie = serialize('spotify_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: -1, // Negative maxAge deletes it
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ success: true });
}
