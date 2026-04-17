export default function handler(req, res) {
  // Clear the cookie
  res.setHeader('Set-Cookie', 'spotify_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.status(200).json({ success: true });
}
