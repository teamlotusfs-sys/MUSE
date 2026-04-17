export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'spotify_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC;');
  res.status(200).json({ success: true });
}
