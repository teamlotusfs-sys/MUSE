const CURATOR_SYSTEM_PROMPT = `You are an elite music curator. Return ONLY valid JSON:
{
  "playlistName": "name",
  "description": "one sentence",
  "tracks": [
    { "title": "Song", "artist": "Artist" }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key missing' });
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
            content: CURATOR_SYSTEM_PROMPT,
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
      console.error('API error:', data);
      return res.status(502).json({ error: 'AI service error' });
    }

    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      return res.status(500).json({ error: 'No response' });
    }

    const cleanedJson = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const playlist = JSON.parse(cleanedJson);
    return res.status(200).json(playlist);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
