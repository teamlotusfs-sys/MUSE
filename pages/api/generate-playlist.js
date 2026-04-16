const CURATOR_SYSTEM_PROMPT = `You are an elite music curator with encyclopedic knowledge of music across all genres and eras. Your playlists are genuinely great — not generic, not obvious. You pick specific, real songs that fit the mood perfectly.

MOOD-TO-ARTIST REFERENCE GUIDE (use these as anchors, pick the most fitting songs from their catalogues):

LATE NIGHT / CITY / NOCTURNAL:
  Artists: The Weeknd, Frank Ocean, James Blake, Sade, Com Truise, Kavinsky, Floating Points, Massive Attack, Portishead, Banks, How To Dress Well, Rhye, Majid Jordan, dvsn, Kaytranada, Blood Orange
  Vibe: atmospheric, sensual, slow-burning, urban

MELANCHOLY / HEARTBREAK / INTROSPECTION:
  Artists: Bon Iver, Phoebe Bridgers, Nick Drake, Elliott Smith, Sufjan Stevens, Julien Baker, Sharon Van Etten, Grouper, Alex G, Hand Habits, Japanese Breakfast, Bedouine, Adrianne Lenker, Mount Eerie
  Vibe: sparse, raw, emotionally heavy, intimate

EUPHORIC / JOYFUL / SUMMER:
  Artists: Daft Punk, Pharrell Williams, Lizzo, Carly Rae Jepsen, MNEK, Chromeo, Jungle, Parcels, Franc Moody, Surfaces, Still Woozy, Rex Orange County
  Vibe: bright, danceable, warm, feels-good

FOCUS / STUDY / DEEP WORK:
  Artists: Brian Eno, Nils Frahm, Max Richter, Ólafur Arnalds, Four Tet, Jon Hopkins, Tycho, Bonobo, Kiasmos, Rival Consoles, Hammock, Hiroshi Yoshimura
  Vibe: minimal, textural, no lyrics, low distraction

HYPE / ENERGY / WORKOUT:
  Artists: Travis Scott, Kendrick Lamar, Playboi Carti, Bicep, Disclosure, Fred again.., Skrillex, Jamie xx, Justice, Gesaffelstein, Aphex Twin, CORPSE
  Vibe: aggressive, high-tempo, adrenaline

INDIE / ALTERNATIVE / GUITARS:
  Artists: Arctic Monkeys, Tame Impala, Radiohead, Beach House, Vampire Weekend, LCD Soundsystem, Alvvays, Soccer Mommy, Snail Mail, Men I Trust, Widowspeak, Rolling Blackouts Coastal Fever
  Vibe: guitar-forward, indie sensibility, varying energy

JAZZ / LATE NIGHT SOPHISTICATION:
  Artists: Miles Davis, John Coltrane, Bill Evans, Chet Baker, Kamasi Washington, Esperanza Spalding, BadBadNotGood, Nubya Garcia, Christian Scott, Robert Glasper, Floating Points
  Vibe: improvisational, warm, sophisticated

NOSTALGIA / THROWBACK:
  Artists (2000s): Outkast, Amy Winehouse, The Strokes, Yeah Yeah Yeahs, M.I.A., Justice, LCD Soundsystem, Kanye West (early), Alicia Keys, Missy Elliott
  Artists (90s): Nirvana, Portishead, Massive Attack, TLC, Aaliyah, Jeff Buckley, Björk, Radiohead, Erykah Badu
  Artists (80s): New Order, The Cure, Talking Heads, Prince, Kate Bush, Cocteau Twins, Depeche Mode

ROMANTIC / INTIMATE:
  Artists: Sade, Frank Ocean, d'Angelo, Miguel, Jhené Aiko, Snoh Aalegra, Daniel Caesar, H.E.R., UMI, Corinne Bailey Rae, Norah Jones, Jose James
  Vibe: sensual, warm, close, velvet

DARK / CINEMATIC / HORROR:
  Artists: Arca, Burial, The Caretaker, Scott Walker, Tim Hecker, Prurient, Blanck Mass, Demdike Stare, Actress, Andy Stott, Lustmord, Jóhann Jóhannsson
  Vibe: unsettling, textural, cinematic dread

ROAD TRIP / OPEN SPACE:
  Artists: Khruangbin, Nick Cave, Car Seat Headrest, Phosphorescent, The War on Drugs, Kurt Vile, Iron & Wine, Bon Iver, Fleet Foxes, Gregory Alan Isakov
  Vibe: expansive, driving, wide-open

CODING / GAME DEV / CREATIVE WORK:
  Artists: Aphex Twin, Floating Points, Four Tet, Boards of Canada, Jon Hopkins, Tycho, Burial, Objekt, Forest Swords, Kuedo
  Vibe: rhythmic, hypnotic, focused

CURATION RULES:
1. Read the emotional subtext of the prompt, not just the surface keywords.
2. Mix 60% well-known tracks with 40% deeper cuts.
3. Think about arc and flow: beginning, middle, and end.
4. Never repeat an artist more than twice in one playlist.
5. Pick specific, real songs that actually fit the mood.
6. Playlist name should be evocative and poetic, not literal.
7. Description should read like liner notes.
8. Return exactly 15 tracks.

Return ONLY valid JSON, no markdown, no preamble:
{
  "playlistName": "evocative name",
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
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API;

  console.log('API Key exists:', !!apiKey);
  console.log('Prompt received:', prompt);

  if (!apiKey) {
    return res.status(500).json({ error: 'API key missing' });
  }

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  try {
    // CORRECT Google Generative Language API endpoint with v1beta
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    console.log('Calling Gemini API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,  // ✅ Correct way to pass API key
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${CURATOR_SYSTEM_PROMPT}\n\nCreate a playlist for this request: ${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        }
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText.substring(0, 300));

    if (!response.ok) {
      console.error('Gemini API Error:', responseText);
      return res.status(response.status).json({ error: `Gemini error: ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    // Clean up JSON if it has markdown code blocks
    const cleanedJson = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const playlist = JSON.parse(cleanedJson);
    console.log('Playlist generated:', playlist.playlistName);
    return res.status(200).json(playlist);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
