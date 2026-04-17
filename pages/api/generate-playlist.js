export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  
  // Try multiple env var names
  const apiKey = process.env.GROQ_API_KEY || 
                 process.env.NEXT_PUBLIC_GROQ_API_KEY ||
                 process.env['GROQ_API_KEY'];

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key not configured',
      available: Object.keys(process.env).filter(k => k.includes('GROQ') || k.includes('API'))
    });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are a music curator. Return ONLY valid JSON with playlistName, description, and tracks array (15 tracks). Each track has title and artist.',
          },
          {
            role: 'user',
            content: `Create a 15-track playlist for: ${prompt}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: 'Groq API error', details: data });
    }

    const generatedText = data.choices?.[0]?.message?.content;
    const cleanedJson = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const playlist = JSON.parse(cleanedJson);
    return res.status(200).json(playlist);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
