import OpenAI from "openai";

const CURATOR_SYSTEM_PROMPT = `You are an elite music curator with encyclopedic knowledge of music across all genres and eras. Your playlists are genuinely great — not generic, not obvious.

MOOD-TO-ARTIST REFERENCE GUIDE:

LATE NIGHT / CITY / NOCTURNAL:
  Artists: The Weeknd, Frank Ocean, James Blake, Sade, Com Truise, Kavinsky, Floating Points, Massive Attack, Portishead, Banks, How To Dress Well, Rhye, Majid Jordan, dvsn, Kaytranada, Blood Orange
  Vibe: atmospheric, sensual, slow-burning, urban

MELANCHOLY / HEARTBREAK / INTROSPECTION:
  Artists: Bon Iver, Phoebe Bridgers, Nick Drake, Elliott Smith, Sufjan Stevens, Julien Baker, Sharon Van Etten, Grouper, Alex G, Hand Habits, Japanese Breakfast, Bedouine
  Vibe: sparse, raw, emotionally heavy, intimate

EUPHORIC / JOYFUL / SUMMER:
  Artists: Daft Punk, Pharrell Williams, Lizzo, Carly Rae Jepsen, MNEK, Chromeo, Jungle, Parcels, Franc Moody, Surfaces, Still Woozy, Rex Orange County
  Vibe: bright, danceable, warm, feels-good

FOCUS / STUDY / DEEP WORK:
  Artists: Brian Eno, Nils Frahm, Max Richter, Ólafur Arnalds, Four Tet, Jon Hopkins, Tycho, Bonobo, Kiasmos, Rival Consoles, Hammock, Hiroshi Yoshimura
  Vibe: minimal, textural, no lyrics, low distraction

HYPE / ENERGY / WORKOUT:
  Artists: Travis Scott, Kendrick Lamar, Playboi Carti, Bicep, Disclosure, Fred again.., Skrillex, Jamie xx, Justice, Gesaffelstein, Aphex Twin
  Vibe: aggressive, high-tempo, adrenaline

INDIE / ALTERNATIVE / GUITARS:
  Artists: Arctic Monkeys, Tame Impala, Radiohead, Beach House, Vampire Weekend, LCD Soundsystem, Alvvays, Soccer Mommy, Snail Mail, Men I Trust
  Vibe: guitar-forward, indie sensibility, varying energy

CURATION RULES:
1. Mix 60% well-known tracks with 40% deeper cuts.
2. Think about arc and flow: beginning, middle, and end.
3. Never repeat an artist more than twice.
4. Pick specific, real songs that actually fit the mood.
5. Return exactly 15 tracks.

Return ONLY valid JSON:
{
  "playlistName": "evocative name",
  "description": "one sentence",
  "tracks": [
    { "title": "Song", "artist": "Artist" }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    const client = new OpenAI({
      apiKey: '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',
      baseURL: "https://api.groq.com/openai/v1",
    });

    const message = await client.chat.completions.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: CURATOR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Create a 15-track playlist for: ${prompt}`,
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

    const playlist = JSON.parse(cleanedJson);
    return res.status(200).json(playlist);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
