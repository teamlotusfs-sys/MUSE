export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  // Simple AI-like playlist generator (no API needed)
  const playlists = {
    'late night': {
      playlistName: 'Neon Nights',
      description: 'Atmospheric tracks for late-night drives through empty streets.',
      tracks: [
        { title: 'Blinding Lights', artist: 'The Weeknd' },
        { title: 'Skin', artist: 'Rihanna' },
        { title: 'Lost', artist: 'Frank Ocean' },
        { title: 'Golden', artist: 'Harry Styles' },
        { title: 'Levitating', artist: 'Dua Lipa' },
        { title: 'Midnight Pretenders', artist: 'The Weeknd' },
        { title: 'Ivy', artist: 'Frank Ocean' },
        { title: 'Nights', artist: 'Frank Ocean' },
        { title: 'Alone, Pt. II', artist: 'Alan Walker' },
        { title: 'Without Me', artist: 'Halsey' },
        { title: 'Bad Habit', artist: 'Steve Lacy' },
        { title: 'Feels Like Home', artist: 'Sabrina Carpenter' },
        { title: 'Redbone', artist: 'Childish Gambino' },
        { title: 'Summertime Sadness', artist: 'Lana Del Rey' },
        { title: 'Die For You', artist: 'The Weeknd' }
      ]
    },
    'love': {
      playlistName: 'Falling Slow',
      description: 'Songs that capture the feeling of gradually falling in love.',
      tracks: [
        { title: 'Falling', artist: 'Harry Styles' },
        { title: 'Lovers', artist: 'Anna of the North' },
        { title: 'Best Day of My Life', artist: 'American Authors' },
        { title: 'Someone Like You', artist: 'Adele' },
        { title: 'All Too Well', artist: 'Taylor Swift' },
        { title: 'Thinking Out Loud', artist: 'Ed Sheeran' },
        { title: 'Golden Hour', artist: 'JVKE' },
        { title: 'Enchanted', artist: 'Taylor Swift' },
        { title: 'Perfect', artist: 'Ed Sheeran' },
        { title: 'Kiss Me', artist: 'Sixpence None The Richer' },
        { title: 'Romantic Homicide', artist: 'd4vd' },
        { title: 'Lover', artist: 'Taylor Swift' },
        { title: 'She Will Be Loved', artist: 'Maroon 5' },
        { title: 'Your Body Is a Wonderland', artist: 'John Mayer' },
        { title: 'Chasing Cars', artist: 'Snow Patrol' }
      ]
    },
    'study': {
      playlistName: 'Deep Focus',
      description: 'Instrumental and ambient tracks designed for concentration.',
      tracks: [
        { title: 'Weightless', artist: 'Marconi Union' },
        { title: 'Mind Clearer', artist: 'Ólafur Arnalds' },
        { title: 'Nuvole Bianche', artist: 'Ludovico Einaudi' },
        { title: 'Fly', artist: 'Ludovico Einaudi' },
        { title: 'The Tower', artist: 'Max Richter' },
        { title: 'Svefn-g-englar', artist: 'Sigur Rós' },
        { title: 'Clocks', artist: 'Coldplay' },
        { title: 'Arrival of the Birds', artist: 'Jon Hopkins' },
        { title: 'Holocene', artist: 'Bon Iver' },
        { title: 'Intro', artist: 'The xx' },
        { title: 'Requiem for the Innocent', artist: 'Globus' },
        { title: 'A Question of Time', artist: 'Ivan Torrent' },
        { title: 'Endeavour', artist: 'Cinematic Strings' },
        { title: 'Meteora', artist: 'Two Steps to Hell' },
        { title: 'Escape', artist: 'Enrique Iglesias' }
      ]
    },
    'workout': {
      playlistName: 'Maximum Energy',
      description: 'High-energy tracks to power through any workout.',
      tracks: [
        { title: 'Stronger', artist: 'Kanye West' },
        { title: 'Till I Collapse', artist: 'Eminem' },
        { title: 'Lose Yourself', artist: 'Eminem' },
        { title: 'High for This', artist: 'The Weeknd' },
        { title: 'Uptown Funk', artist: 'Mark Ronson' },
        { title: 'Play That Funky Music', artist: 'Wild Cherry' },
        { title: 'One Kiss', artist: 'Calvin Harris' },
        { title: 'Titanium', artist: 'David Guetta' },
        { title: 'Animals', artist: 'Martin Garrix' },
        { title: 'Lean On', artist: 'Major Lazer' },
        { title: 'Shut Up and Dance', artist: 'Walk the Moon' },
        { title: 'Pump It Up', artist: 'Endor' },
        { title: 'Echoes', artist: 'Edith Whiskers' },
        { title: 'Energy', artist: 'Fatboy Slim' },
        { title: 'Turn Down for What', artist: 'DJ Snake' }
      ]
    }
  };

  // Find matching playlist based on prompt keywords
  let selectedPlaylist = playlists.study; // default

  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('late') || lowerPrompt.includes('night') || lowerPrompt.includes('drive')) {
    selectedPlaylist = playlists['late night'];
  } else if (lowerPrompt.includes('love') || lowerPrompt.includes('falling') || lowerPrompt.includes('romantic')) {
    selectedPlaylist = playlists.love;
  } else if (lowerPrompt.includes('study') || lowerPrompt.includes('work') || lowerPrompt.includes('focus')) {
    selectedPlaylist = playlists.study;
  } else if (lowerPrompt.includes('workout') || lowerPrompt.includes('gym') || lowerPrompt.includes('hype') || lowerPrompt.includes('energy')) {
    selectedPlaylist = playlists.workout;
  }

  return res.status(200).json(selectedPlaylist);
}
