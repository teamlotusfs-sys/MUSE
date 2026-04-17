import { useState, useEffect, useRef } from "react";

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : '';
const SCOPES = "playlist-modify-public playlist-modify-private";

function getSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
   redirect_uri: `${REDIRECT_URI}/api/auth/callback`,
    scope: SCOPES,
    show_dialog: "true",
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

// ─── Spotify API Helpers ─────────────────────────────────────────────────────
async function spotifySearch(token, query) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.tracks?.items?.[0] || null;
}

async function getSpotifyUser(token) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function createSpotifyPlaylist(token, userId, name, description) {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, public: false }),
  });
  return res.json();
}

async function addTracksToPlaylist(token, playlistId, uris) {
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris }),
  });
}

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

async function generatePlaylist(prompt) {
  console.log("Sending prompt to API:", prompt);
  const response = await fetch("/api/generate-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  console.log("API response status:", response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error("API error:", error);
    throw new Error(error.error || "Failed to generate playlist");
  }

  const data = await response.json();
  console.log("Playlist received:", data);
  return data;
}

// ─── Animated Waveform ──────────────────────────────────────────────────────
function Waveform({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? "#1DB954" : "#444",
            height: active ? undefined : 6,
            animation: active ? `wave ${0.8 + i * 0.15}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { height: 4px; }
          to { height: 20px; }
        }
      `}</style>
    </div>
  );
}

// ─── Track Row ─────────────────────────────────────────────────────────────
function TrackRow({ track, index, status }) {
  const statusColor = status === "found" ? "#1DB954" : status === "missing" ? "#e74c3c" : "#555";
  const statusIcon = status === "found" ? "✓" : status === "missing" ? "✗" : "·";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 16px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: "fadeSlideIn 0.4s ease forwards",
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
    >
      <span style={{ color: "#444", fontSize: 13, width: 20, textAlign: "right", fontFamily: "monospace" }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>{track.artist}</div>
      </div>
      <span style={{ color: statusColor, fontSize: 16, fontWeight: 700, width: 20, textAlign: "center" }}>
        {statusIcon}
      </span>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | generating | adding | done | error
  const [playlist, setPlaylist] = useState(null);
  const [trackStatuses, setTrackStatuses] = useState([]);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef(null);

  // Check for Spotify token in cookies
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setSpotifyUser(user);
          setSpotifyToken(true); // Token exists, we're authenticated
        }
      } catch (err) {
        console.log("Not authenticated with Spotify");
      }
    }
    checkAuth();
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setPhase("generating");
    setPlaylist(null);
    setTrackStatuses([]);
    setSpotifyPlaylistUrl(null);
    setErrorMsg("");

    try {
      const result = await generatePlaylist(prompt);
      setPlaylist(result);
      setTrackStatuses(result.tracks.map(() => "pending"));

      if (spotifyToken) {
        setPhase("adding");

        const createRes = await fetch("/api/create-playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistName: result.playlistName,
            description: result.description,
            tracks: result.tracks,
          }),
        });

        if (!createRes.ok) {
          const error = await createRes.json();
          throw new Error(error.error || "Failed to create Spotify playlist");
        }

        const playlistData = await createRes.json();
        setSpotifyPlaylistUrl(playlistData.playlist.url);
        
        // Update track statuses based on tracks added
        setTrackStatuses(result.tracks.map(() => "found"));
        setPhase("done");
      } else {
        setTrackStatuses(result.tracks.map(() => "found"));
        setPhase("done");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong. Check your API keys and try again.");
      setPhase("error");
    }
  }

  const examplePrompts = [
    "music for a late night drive through a neon city",
    "songs that feel like falling in love slowly",
    "2000s indie rock for studying",
    "dark ambient for a horror game",
    "upbeat jazz for a sunny Sunday morning",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,700;1,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea:focus { outline: none; }
        .generate-btn:hover { background: #1ed760 !important; transform: translateY(-1px); }
        .generate-btn:active { transform: translateY(0); }
        .example-chip:hover { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
      `}</style>

      {/* Noise texture overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' result='noise'/%3E%3CfeColorMatrix in='noise' type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='256' height='256' fill='black' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        opacity: 0.6,
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(29,185,84,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 56, animation: "fadeSlideIn 0.6s ease forwards" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Waveform active={phase === "generating" || phase === "adding"} />
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>
                tuneforge
              </span>
            </div>

            {/* Spotify auth button */}
            {!spotifyToken ? (
              <a
                href="/api/auth/spotify"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 100,
                  background: "rgba(29,185,84,0.15)", border: "1px solid rgba(29,185,84,0.3)",
                  color: "#1DB954", fontSize: 13, fontWeight: 500, textDecoration: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(29,185,84,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(29,185,84,0.15)")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.36.144-.643.499-.771 3.395-1.081 7.001-.651 10.051.873.359.207.912.159 1.141-.438l.748-1.341zm1.44-3.3c-.301.466-.841.515-1.306.309-3.604-2.214-9.037-2.854-13.321-1.561-.473.134-.906-.172-.994-.646-.09-.474.191-.922.665-1.012 4.818-1.402 10.504-.655 14.523 1.78.561.331 1.007 1.01.703 1.52zm.133-3.467c-4.37-2.596-11.6-2.827-15.775-1.482-.568.16-1.135-.164-1.282-.744-.148-.584.145-1.189.712-1.345 4.871-1.56 12.655-1.285 17.579 1.718.56.33.855 1.026.55 1.531-.305.505-1.08.684-1.634.423z" />
                </svg>
                Connect Spotify
              </a>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 100, background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.2)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1DB954" }} />
                <span style={{ color: "#1DB954", fontSize: 13 }}>
                  {spotifyUser?.display_name || "Connected"}
                </span>
              </div>
            )}
          </div>
) : (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 100, background: "rgba(29,185,84,0.1)", border: "1px solid rgba(29,185,84,0.2)" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1DB954" }} />
      <span style={{ color: "#1DB954", fontSize: 13 }}>
        {spotifyUser?.display_name || "Connected"}
      </span>
    </div>
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setSpotifyToken(null);
        setSpotifyUser(null);
      }}
      style={{
        padding: "8px 16px", borderRadius: 100,
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
        color: "#aaa", fontSize: 13, fontWeight: 500, cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
    >
      Logout
    </button>
  </div>
)}
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 42, fontWeight: 300, lineHeight: 1.1, letterSpacing: "-1.5px", color: "#fff" }}>
            Describe your<br />
            <em style={{ fontStyle: "italic", color: "#1DB954" }}>perfect playlist.</em>
          </h1>
          <p style={{ color: "#666", fontSize: 15, marginTop: 14, lineHeight: 1.6 }}>
            Tell us a mood, moment, or memory — we'll build a playlist and{" "}
            {spotifyToken ? "add it straight to your Spotify." : "connect Spotify to auto-save it."}
          </p>
        </div>

        {/* Prompt input */}
        <div style={{ marginBottom: 20, animation: "fadeSlideIn 0.6s ease 0.1s forwards", opacity: 0 }}>
          <div style={{
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
            background: "rgba(255,255,255,0.04)", overflow: "hidden",
            transition: "border-color 0.2s",
          }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "rgba(29,185,84,0.4)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder="e.g. rainy afternoon in a coffee shop, early 2000s nostalgia, pre-game hype, post-breakup catharsis..."
              style={{
                width: "100%", minHeight: 110, padding: "20px",
                background: "transparent", border: "none", resize: "none",
                color: "#fff", fontSize: 16, lineHeight: 1.6, fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "#444", fontSize: 12 }}>⌘↵ to generate</span>
              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={!prompt.trim() || phase === "generating" || phase === "adding"}
                style={{
                  padding: "10px 24px", borderRadius: 100, border: "none",
                  background: "#1DB954", color: "#000", fontFamily: "inherit",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.2s", opacity: (!prompt.trim() || phase === "generating" || phase === "adding") ? 0.4 : 1,
                }}
              >
                {phase === "generating" ? "Generating..." : phase === "adding" ? "Adding to Spotify..." : "Generate Playlist"}
              </button>
            </div>
          </div>
        </div>

        {/* Example chips */}
        {phase === "idle" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40, animation: "fadeSlideIn 0.6s ease 0.2s forwards", opacity: 0 }}>
            {examplePrompts.map((ex) => (
              <button
                key={ex}
                className="example-chip"
                onClick={() => setPrompt(ex)}
                style={{
                  padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "#888", fontSize: 12,
                  fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {(phase === "generating") && (
          <div style={{ textAlign: "center", padding: "40px 0", animation: "fadeSlideIn 0.4s ease forwards" }}>
            <div style={{ width: 32, height: 32, border: "2px solid rgba(29,185,84,0.2)", borderTopColor: "#1DB954", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#666", fontSize: 14, animation: "pulse 2s ease infinite" }}>
              Curating your playlist...
            </p>
          </div>
        )}

        {/* Playlist results */}
        {playlist && (phase === "adding" || phase === "done") && (
          <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>
                    {playlist.playlistName}
                  </h2>
                  <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>{playlist.description}</p>
                </div>
                {phase === "adding" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1DB954", fontSize: 13, whiteSpace: "nowrap", paddingTop: 4 }}>
                    <div style={{ width: 12, height: 12, border: "1.5px solid rgba(29,185,84,0.3)", borderTopColor: "#1DB954", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Searching Spotify...
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {playlist.tracks.map((track, i) => (
                <TrackRow
                  key={i}
                  track={track}
                  index={i}
                  status={trackStatuses[i] || "pending"}
                />
              ))}
            </div>

            {phase === "done" && (
              <div style={{ marginTop: 28, padding: 20, borderRadius: 12, background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)", animation: "fadeSlideIn 0.5s ease forwards" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ color: "#1DB954", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {spotifyPlaylistUrl ? "✓ Playlist added to Spotify!" : "✓ Playlist generated!"}
                    </div>
                    <div style={{ color: "#666", fontSize: 13 }}>
                      {trackStatuses.filter((s) => s === "found").length} of {playlist.tracks.length} tracks matched
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {spotifyPlaylistUrl && (
                      <a
                        href={spotifyPlaylistUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 20px", borderRadius: 100,
                          background: "#1DB954", color: "#000",
                          fontSize: 13, fontWeight: 600, textDecoration: "none",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954")}
                      >
                        Open in Spotify →
                      </a>
                    )}
                    <button
                      onClick={() => { setPhase("idle"); setPlaylist(null); setPrompt(""); }}
                      style={{
                        padding: "10px 20px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.15)",
                        background: "transparent", color: "#aaa", fontSize: 13,
                        fontFamily: "inherit", cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
                    >
                      New Playlist
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div style={{ padding: 20, borderRadius: 12, background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)", animation: "fadeSlideIn 0.4s ease forwards" }}>
            <p style={{ color: "#e74c3c", fontSize: 14 }}>{errorMsg}</p>
            <button
              onClick={() => setPhase("idle")}
              style={{ marginTop: 12, color: "#888", fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Setup reminder if Spotify not connected */}
        {!spotifyToken && phase === "idle" && (
          <div style={{ marginTop: 40, padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "#555", lineHeight: 1.6 }}>
            <strong style={{ color: "#777" }}>Quick start:</strong> Click "Connect Spotify" above to link your account and auto-save generated playlists.
          </div>
        )}
      </div>
    </div>
  );
}
