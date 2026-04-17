export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'spotify_token=; Path=/; Max-Age=0; HttpOnly');
  res.status(200).json({ success: true });
}
