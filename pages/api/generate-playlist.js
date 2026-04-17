const CURATOR_SYSTEM_PROMPT = `You are an elite music curator with encyclopedic knowledge of music across all genres and eras. Your playlists are genuinely great — not generic, not obvious.

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
  // Set CORS headers for safety
  res.setHeader('Content-Type', 'application/json');
  
  // Log incoming request for debugging
  console.log('=== INCOMING REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers));
  
  // Validate HTTP method - MUST be POST
  if (req.method !== 'POST') {
    console.error('❌ Invalid method. Expected POST, got:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: `Expected POST, got ${req.method}`
    });
  }
  
  // Extract and validate prompt from request body
  let prompt;
  try {
    prompt = req.body?.prompt;
    console.log('Prompt received:', prompt ? prompt.substring(0, 50) + '...' : '(empty)');
  } catch (e) {
    console.error('❌ Error parsing request body:', e.message);
    return res.status(400).json({ 
      error: 'Invalid request body',
      details: 'Could not parse JSON body'
    });
  }
  
  // Validate prompt exists and is not empty
  if (!prompt || !prompt.trim()) {
    console.error('❌ Prompt is empty or missing');
    return res.status(400).json({ 
      error: 'Prompt required',
      details: 'Please provide a non-empty prompt'
    });
  }
  
  // Get API key from environment - try both variable names
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API;
  
  if (!apiKey) {
    console.error('❌ API key not found in environment variables');
    console.error('Available env vars (GEMINI_*):');
    Object.keys(process.env).forEach(key => {
      if (key.includes('GEMINI')) {
        console.error(`  - ${key}: ${process.env[key] ? '(set)' : '(empty)'});`
      }
    });
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'API key not found. Check GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API environment variables'
    });
  }
  
  try {
    console.log('📤 Calling Gemini API...');
    
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    // Build the request payload
    const payload = {
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
    };
    
    // Make the API call
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload)
    });
    
    console.log('✅ Gemini API response status:', geminiResponse.status);
    
    const responseText = await geminiResponse.text();
    
    // Check if the API call was successful
    if (!geminiResponse.ok) {
      console.error('❌ Gemini API error:', geminiResponse.status);
      console.error('Response:', responseText.substring(0, 500));
      return res.status(502).json({ 
        error: 'AI service error',
        details: `Gemini API returned status ${geminiResponse.status}`
      });
    }
    
    // Parse the Gemini response
    let geminiData;
    try {
      geminiData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Gemini response as JSON:', e.message);
      console.error('Raw response:', responseText.substring(0, 300));
      return res.status(502).json({ 
        error: 'Invalid AI response',
        details: 'Could not parse AI service response'
      });
    }
    
    // Extract the generated text from Gemini response
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error('❌ No text content in Gemini response');
      console.error('Response structure:', JSON.stringify(geminiData).substring(0, 300));
      return res.status(502).json({ 
        error: 'Empty AI response',
        details: 'AI service returned empty content'
      });
    }
    
    console.log('✅ Generated text received, length:', generatedText.length);
    
    // Clean up the response (remove markdown formatting if present)
    const cleanedJson = generatedText
      .replace(/^```json\n?/g, '')
      .replace(/^```\n?/g, '')
      .replace(/\n?```$/g, '')
      .trim();
    
    console.log('📝 Cleaned JSON:', cleanedJson.substring(0, 100) + '...');
    
    // Parse the playlist JSON
    let playlist;
    try {
      playlist = JSON.parse(cleanedJson);
    } catch (e) {
      console.error('❌ Failed to parse playlist JSON:', e.message);
      console.error('Attempted to parse:', cleanedJson.substring(0, 300));
      return res.status(502).json({ 
        error: 'Invalid playlist format',
        details: 'AI response was not valid JSON'
      });
    }
    
    // Validate playlist structure
    if (!playlist.playlistName || !playlist.description || !Array.isArray(playlist.tracks)) {
      console.error('❌ Playlist missing required fields');
      console.error('Received:', JSON.stringify(playlist).substring(0, 200));
      return res.status(502).json({ 
        error: 'Invalid playlist structure',
        details: 'Missing playlistName, description, or tracks'
      });
    }
    
    console.log('✅ Playlist generated successfully:', playlist.playlistName);
    console.log('✅ Tracks:', playlist.tracks.length);
    
    // Return the successful response
    return res.status(200).json(playlist);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}