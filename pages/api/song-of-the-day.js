import OpenAI from "openai";

const SOTD_SYSTEM_PROMPT = `You are an elite music curator. Your job is to suggest ONE amazing song as the song of the day.

Generate a truly great song recommendation - something that's either:
- A classic deep cut that deserves rediscovery
- A hidden gem from a well-known artist
- A unique song that captures today's vibe
- Something universally enjoyable but not obvious

Include a 2-3 sentence description explaining why this song is perfect.

Return ONLY valid JSON:
{
  "title": "Song Name",
  "artist": "Artist Name",
  "description": "Why this song is perfect for today..."
}`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API key not configured. Check GROQ_API_KEY or OPENAI_API_KEY in environment variables.' 
    });
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1",
      dangerouslyAllowBrowser: false,
    });
    
    const message = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: SOTD_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Suggest today's song of the day. Make it something special and unique.`,
        },
      ],
    });

    const generatedText = message.choices[0].message.content;

    if (!generatedText) {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const cleanedJson = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const song = JSON.parse(cleanedJson);

    // Now search Spotify for the song to get artwork and preview
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
          body: 'grant_type=client_credentials',
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          const searchQuery = encodeURIComponent(`track:"${song.title}" artist:"${song.artist}"`);
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (searchRes.ok) {
            const data = await searchRes.json();
            const track = data.tracks?.items?.[0];

            if (track) {
              song.imageUrl = track.album?.images?.[0]?.url || null;
              song.previewUrl = track.preview_url || null;
            }
          }
        }
      }
    } catch (spotifyError) {
      console.error('Error fetching from Spotify:', spotifyError);
      // Continue without artwork/preview
    }

    return res.status(200).json(song);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
