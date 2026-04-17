export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug: Log ALL environment variables
  console.log('All env vars:', Object.keys(process.env));
  console.log('GROQ_API_KEY exists?', !!process.env.GROQ_API_KEY);
  console.log('GROQ_API_KEY value:', process.env.GROQ_API_KEY);

  return res.status(200).json({
    message: 'Debug info logged to console',
    hasGroqKey: !!process.env.GROQ_API_KEY,
    groqKeyValue: process.env.GROQ_API_KEY || 'NOT FOUND',
  });
}
