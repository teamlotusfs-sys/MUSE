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

async function generatePlaylist(prompt) {
  const response = await fetch("/api/generate-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate playlist");
  }

  return response.json();
}

function Waveform({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? "#1DB954" : "#333",
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

function TrackRow({ track, index, status }) {
  const statusColor = status === "found" ? "#1DB954" : status === "missing" ? "#e74c3c" : "#555";
  const statusIcon = status === "found" ? "✓" : status === "missing" ? "✗" : "·";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        animation: "fadeSlideIn 0.4s ease forwards",
        animationDelay: `${index * 0.05}s`,
        opacity: 0,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
    >
      <span style={{ color: "#555", fontSize: 12, width: 20, textAlign: "right", fontFamily: "monospace" }}>
        {index + 1}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ color: "#777", fontSize: 12, marginTop: 2 }}>{track.artist}</div>
      </div>
      <span style={{ color: statusColor, fontSize: 16, fontWeight: 700, width: 20, textAlign: "center" }}>
        {statusIcon}
      </span>
    </div>
  );
}

export default function App() {
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("idle");
  const [playlist, setPlaylist] = useState(null);
  const [trackStatuses, setTrackStatuses] = useState([]);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  const textareaRef = useRef(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const user = await res.json();
          setSpotifyUser(user);
          setSpotifyToken(true);
        }
      } catch (err) {
        console.log("Not authenticated");
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
        setTrackStatuses(result.tracks.map(() => "found"));
        setPhase("done");
      } else {
        setTrackStatuses(result.tracks.map(() => "found"));
        setPhase("done");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong");
      setPhase("error");
    }
  }

  const examplePrompts = [
    "late night city drive with neon lights",
    "falling in love slowly",
    "2000s indie rock for studying",
    "dark ambient for focused work",
    "summer morning vibes",
  ];

  const tabs = [
    { id: "create", label: "Create Playlist", icon: "✨" },
    { id: "discover", label: "Discover", icon: "🎵", disabled: true },
    { id: "history", label: "History", icon: "⏱️", disabled: true },
    { id: "trending", label: "Trending Now", icon: "🔥", disabled: true },
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
      `}</style>

      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.08) 0%, transparent 50%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        
        {/* Header with Auth */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 48,
          animation: "fadeSlideIn 0.6s ease forwards",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Waveform active={phase === "generating" || phase === "adding"} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700 }}>
              MUSE
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!spotifyToken ? (
              <a
                href="/api/auth/spotify"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 100,
                  background: "#1DB954",
                  color: "#000",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954")}
              >
                🎵 Connect Spotify
              </a>
            ) : (
              <>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 100,
                  background: "rgba(29,185,84,0.1)",
                  border: "1px solid rgba(29,185,84,0.3)",
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1DB954" }} />
                  <span style={{ color: "#1DB954", fontSize: 12, fontWeight: 500 }}>
                    {spotifyUser?.display_name || "Connected"}
                  </span>
                </div>
               <button
  onClick={async () => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear the cookie
    await fetch("/api/auth/logout", { method: "POST" });
    
    // Reset state
    setSpotifyToken(null);
    setSpotifyUser(null);
    
    // Redirect to home
    window.location.href = '/';
  }}
  style={{
    padding: "8px 14px",
    borderRadius: 100,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#aaa",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "inherit",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
    e.currentTarget.style.color = "#fff";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
    e.currentTarget.style.color = "#aaa";
  }}
>
  Logout
</button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: 12,
          marginBottom: 40,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: 16,
          animation: "fadeSlideIn 0.6s ease 0.1s forwards",
          opacity: 0,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: activeTab === tab.id ? "rgba(29,185,84,0.15)" : "transparent",
                color: activeTab === tab.id ? "#1DB954" : tab.disabled ? "#555" : "#888",
                fontSize: 13,
                fontWeight: 500,
                cursor: tab.disabled ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
                borderBottom: activeTab === tab.id ? "2px solid #1DB954" : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!tab.disabled) {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!tab.disabled) {
                  e.currentTarget.style.color = activeTab === tab.id ? "#1DB954" : "#888";
                  e.currentTarget.style.background = activeTab === tab.id ? "rgba(29,185,84,0.15)" : "transparent";
                }
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
              {tab.disabled && <span style={{ marginLeft: 4, fontSize: 11 }}>(soon)</span>}
            </button>
          ))}
        </div>

        {/* Create Playlist Tab */}
        {activeTab === "create" && (
          <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ marginBottom: 40 }}>
              <h1 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 48,
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-1px",
                marginBottom: 12,
              }}>
                Describe your
                <br />
                <span style={{ color: "#1DB954", fontStyle: "italic" }}>perfect playlist</span>
              </h1>
              <p style={{ color: "#777", fontSize: 15, maxWidth: 500 }}>
                Tell us a mood, moment, or vibe — our AI will craft a unique playlist just for you{spotifyToken ? " and add it to your Spotify." : "."}
              </p>
            </div>

            {/* Input Box */}
            <div style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              overflow: "hidden",
              transition: "all 0.3s",
              marginBottom: 24,
            }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(29,185,84,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
                placeholder="e.g., late night drive through neon streets, Sunday morning coffee vibes, breakup anthems..."
                style={{
                  width: "100%",
                  minHeight: 120,
                  padding: "24px",
                  background: "transparent",
                  border: "none",
                  resize: "none",
                  color: "#fff",
                  fontSize: 16,
                  lineHeight: 1.6,
                  fontFamily: "inherit",
                }}
              />
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.01)",
              }}>
                <span style={{ color: "#555", fontSize: 11 }}>⌘↵ or Ctrl↵ to generate</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || phase === "generating" || phase === "adding"}
                  style={{
                    padding: "12px 32px",
                    borderRadius: 100,
                    border: "none",
                    background: "#1DB954",
                    color: "#000",
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    opacity: (!prompt.trim() || phase === "generating" || phase === "adding") ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => !(!prompt.trim() || phase === "generating" || phase === "adding") && (e.currentTarget.style.background = "#1ed760", e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954", e.currentTarget.style.transform = "translateY(0)")}
                >
                  {phase === "generating" ? "Generating..." : phase === "adding" ? "Adding..." : "✨ Generate"}
                </button>
              </div>
            </div>

            {/* Example Prompts */}
            {phase === "idle" && (
              <div style={{ marginBottom: 40 }}>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Try one of these
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {examplePrompts.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#aaa",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(29,185,84,0.15)";
                        e.currentTarget.style.color = "#1DB954";
                        e.currentTarget.style.borderColor = "rgba(29,185,84,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.color = "#aaa";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {phase === "generating" && (
              <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeSlideIn 0.4s ease forwards" }}>
                <div style={{
                  width: 48,
                  height: 48,
                  border: "2px solid rgba(29,185,84,0.2)",
                  borderTopColor: "#1DB954",
                  borderRadius: "50%",
                  margin: "0 auto 24px",
                  animation: "spin 0.8s linear infinite",
                }} />
                <p style={{ color: "#888", fontSize: 15 }}>Curating your perfect playlist...</p>
              </div>
            )}

            {/* Playlist Results */}
            {playlist && (phase === "adding" || phase === "done") && (
              <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
                    <div>
                      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                        {playlist.playlistName}
                      </h2>
                      <p style={{ color: "#777", fontSize: 14 }}>{playlist.description}</p>
                    </div>
                    {phase === "adding" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1DB954", fontSize: 13, whiteSpace: "nowrap" }}>
                        <div style={{ width: 12, height: 12, border: "1.5px solid rgba(29,185,84,0.3)", borderTopColor: "#1DB954", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Searching Spotify...
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {playlist.tracks.map((track, i) => (
                    <TrackRow key={i} track={track} index={i} status={trackStatuses[i] || "pending"} />
                  ))}
                </div>

                {phase === "done" && (
                  <div style={{
                    marginTop: 32,
                    padding: 24,
                    borderRadius: 12,
                    background: "rgba(29,185,84,0.08)",
                    border: "1px solid rgba(29,185,84,0.25)",
                    animation: "fadeSlideIn 0.5s ease forwards",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                      <div>
                        <div style={{ color: "#1DB954", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                          ✓ {spotifyPlaylistUrl ? "Playlist added to Spotify!" : "Playlist generated!"}
                        </div>
                        <div style={{ color: "#777", fontSize: 13 }}>
                          {trackStatuses.filter((s) => s === "found").length} of {playlist.tracks.length} tracks matched
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        {spotifyPlaylistUrl && (
                          <a
                            href={spotifyPlaylistUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "12px 24px",
                              borderRadius: 100,
                              background: "#1DB954",
                              color: "#000",
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                              transition: "all 0.2s",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760", e.currentTarget.style.transform = "translateY(-2px)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954", e.currentTarget.style.transform = "translateY(0)")}
                          >
                            🎵 Open in Spotify
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setPhase("idle");
                            setPlaylist(null);
                            setPrompt("");
                          }}
                          style={{
                            padding: "12px 24px",
                            borderRadius: 100,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.05)",
                            color: "#aaa",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            e.currentTarget.style.color = "#aaa";
                          }}
                        >
                          ✨ Create Another
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error State */}
            {phase === "error" && (
              <div style={{
                padding: 24,
                borderRadius: 12,
                background: "rgba(231,76,60,0.1)",
                border: "1px solid rgba(231,76,60,0.25)",
                animation: "fadeSlideIn 0.4s ease forwards",
              }}>
                <p style={{ color: "#ff6b6b", fontSize: 14, marginBottom: 12 }}>{errorMsg}</p>
                <button
                  onClick={() => setPhase("idle")}
                  style={{
                    color: "#ff6b6b",
                    fontSize: 13,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    fontWeight: 500,
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {!spotifyToken && phase === "idle" && (
              <div style={{
                marginTop: 40,
                padding: 20,
                borderRadius: 12,
                background: "rgba(29,185,84,0.08)",
                border: "1px solid rgba(29,185,84,0.2)",
                fontSize: 13,
                color: "#777",
              }}>
                <span style={{ color: "#1DB954", fontWeight: 600 }}>💡 Tip:</span> Connect your Spotify account to automatically save playlists!
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== "create" && (
          <div style={{
            textAlign: "center",
            padding: "80px 24px",
            color: "#666",
            animation: "fadeSlideIn 0.5s ease forwards",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
            <p style={{ fontSize: 14 }}>Coming soon! We're building something amazing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
