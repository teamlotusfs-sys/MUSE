import { useState, useEffect, useRef } from "react";

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

async function searchSpotifyForArtwork(artist, title) {
  try {
    const response = await fetch("/api/search-spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist, title }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.imageUrl || null;
    }
  } catch (err) {
    console.error("Failed to fetch artwork:", err);
  }
  return null;
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

function TrackRow({ track, index }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
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
      {/* Album Art Thumbnail */}
      {track.imageUrl ? (
        <img
          src={track.imageUrl}
          alt={track.title}
          style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            background: "rgba(29,185,84,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🎵
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ color: "#777", fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.artist}
        </div>
      </div>

      <span style={{ color: "#1DB954", fontSize: 14, fontWeight: 700, width: 20, textAlign: "center", flexShrink: 0 }}>
        ✓
      </span>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authPhase, setAuthPhase] = useState("login"); // login, register, authenticated
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("idle");
  const [playlist, setPlaylist] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [loadingArtwork, setLoadingArtwork] = useState(false);
  
  const textareaRef = useRef(null);

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("tuneforge_user");
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setAuthPhase("authenticated");
      setSavedPlaylists(JSON.parse(localStorage.getItem("tuneforge_playlists") || "[]"));
    }
  }, []);

  function handleLogin() {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg("Email and password required");
      return;
    }

    const userData = {
      id: Date.now(),
      email: loginEmail,
      name: loginEmail.split("@")[0],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("tuneforge_user", JSON.stringify(userData));
    setUser(userData);
    setAuthPhase("authenticated");
    setLoginEmail("");
    setLoginPassword("");
    setErrorMsg("");
  }

  function handleRegister() {
    if (!registerEmail.trim() || !registerPassword.trim() || !registerName.trim()) {
      setErrorMsg("All fields required");
      return;
    }

    const userData = {
      id: Date.now(),
      email: registerEmail,
      name: registerName,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("tuneforge_user", JSON.stringify(userData));
    setUser(userData);
    setAuthPhase("authenticated");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterName("");
    setErrorMsg("");
  }

  function handleLogout() {
    localStorage.removeItem("tuneforge_user");
    localStorage.removeItem("tuneforge_playlists");
    setUser(null);
    setAuthPhase("login");
    setSavedPlaylists([]);
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setPhase("generating");
    setPlaylist(null);
    setErrorMsg("");
    setLoadingArtwork(false);

    try {
      const result = await generatePlaylist(prompt);
      
      // Fetch album artwork for each track
      setLoadingArtwork(true);
      const tracksWithArtwork = await Promise.all(
        result.tracks.map(async (track) => {
          const imageUrl = await searchSpotifyForArtwork(track.artist, track.title);
          return { ...track, imageUrl };
        })
      );
      setLoadingArtwork(false);

      const playlistWithArtwork = { ...result, tracks: tracksWithArtwork };
      setPlaylist(playlistWithArtwork);
      setPhase("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong");
      setPhase("error");
    }
  }

  function savePlaylist() {
    if (!playlist) return;

    const saved = {
      id: Date.now(),
      ...playlist,
      savedAt: new Date().toISOString(),
    };

    const updated = [saved, ...savedPlaylists];
    setSavedPlaylists(updated);
    localStorage.setItem("tuneforge_playlists", JSON.stringify(updated));
    setErrorMsg("");
  }

  function downloadCSV() {
    if (!playlist) return;

    const csvContent = [
      playlist.tracks.map(track => `${track.artist}\t${track.title}`).join('\n')
    ].join('\n');

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `${playlist.playlistName.replace(/\s+/g, '_')}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  const examplePrompts = [
    "late night city drive with neon lights",
    "falling in love slowly",
    "2000s indie rock for studying",
    "dark ambient for focused work",
    "summer morning vibes",
  ];

  const tabs = [
    { id: "create", label: "Create", icon: "✨" },
    { id: "discover", label: "Discover", icon: "🎵", disabled: true },
    { id: "history", label: "History", icon: "⏱️" },
    { id: "trending", label: "Trending", icon: "🔥", disabled: true },
  ];

  // Auth UI
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,700;1,300&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          textarea:focus { outline: none; }
        `}</style>

        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.08) 0%, transparent 50%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 400, margin: "0 auto", padding: "80px 24px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 48, textAlign: "center" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 48, fontWeight: 700, marginBottom: 8 }}>
              TuneForge
            </div>
            <p style={{ color: "#777", fontSize: 14 }}>AI-powered playlist generator</p>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setAuthPhase("login")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: authPhase === "login" ? "#1DB954" : "rgba(255,255,255,0.1)",
                color: authPhase === "login" ? "#000" : "#fff",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthPhase("register")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: authPhase === "register" ? "#1DB954" : "rgba(255,255,255,0.1)",
                color: authPhase === "register" ? "#000" : "#fff",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              Register
            </button>
          </div>

          {authPhase === "login" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#1DB954",
                  color: "#000",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  marginTop: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954")}
              >
                Login
              </button>
            </div>
          )}

          {authPhase === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                placeholder="Full Name"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <input
                type="email"
                placeholder="Email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleRegister}
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#1DB954",
                  color: "#000",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  marginTop: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954")}
              >
                Create Account
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.25)", color: "#ff6b6b", fontSize: 13 }}>
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main App UI
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea:focus { outline: none; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.08) 0%, transparent 50%)",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 48,
          animation: "fadeSlideIn 0.6s ease forwards",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Waveform active={phase === "generating"} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700 }}>
              TuneForge
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
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

        {/* Create Tab */}
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
                Forge your
                <br />
                <span style={{ color: "#1DB954", fontStyle: "italic" }}>perfect playlist</span>
              </h1>
              <p style={{ color: "#777", fontSize: 15, maxWidth: 500 }}>
                Tell us a mood, moment, or vibe — our AI will craft a unique playlist with album artwork.
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
                  disabled={!prompt.trim() || phase === "generating"}
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
                    opacity: (!prompt.trim() || phase === "generating") ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => !(!prompt.trim() || phase === "generating") && (e.currentTarget.style.background = "#1ed760", e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954", e.currentTarget.style.transform = "translateY(0)")}
                >
                  {phase === "generating" ? "Generating..." : "✨ Forge"}
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
                <p style={{ color: "#888", fontSize: 15 }}>
                  {loadingArtwork ? "Gathering album artwork..." : "Forging your playlist..."}
                </p>
              </div>
            )}

            {/* Playlist Results */}
            {playlist && phase === "done" && (
              <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
                <div style={{ marginBottom: 32 }}>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                    {playlist.playlistName}
                  </h2>
                  <p style={{ color: "#777", fontSize: 14 }}>{playlist.description}</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
                  {playlist.tracks.map((track, i) => (
                    <TrackRow key={i} track={track} index={i} />
                  ))}
                </div>

                <div style={{
                  padding: 24,
                  borderRadius: 12,
                  background: "rgba(29,185,84,0.08)",
                  border: "1px solid rgba(29,185,84,0.25)",
                  animation: "fadeSlideIn 0.5s ease forwards",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <div style={{ color: "#1DB954", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        ✓ Playlist forged!
                      </div>
                      <div style={{ color: "#777", fontSize: 13 }}>
                        {playlist.tracks.length} tracks with artwork
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        onClick={savePlaylist}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px 24px",
                          borderRadius: 100,
                          background: "rgba(29,185,84,0.2)",
                          border: "1px solid rgba(29,185,84,0.4)",
                          color: "#1DB954",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(29,185,84,0.3)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(29,185,84,0.2)")}
                      >
                        💾 Save to Library
                      </button>
                      <button
                        onClick={downloadCSV}
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
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1ed760", e.currentTarget.style.transform = "translateY(-2px)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#1DB954", e.currentTarget.style.transform = "translateY(0)")}
                      >
                        📥 Download
                      </button>
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
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
              Your Library
            </h2>

            {savedPlaylists.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "#666" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
                <p style={{ fontSize: 14 }}>No saved playlists yet. Create one to get started!</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {savedPlaylists.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
                      {p.tracks.slice(0, 4).map((track, i) => (
                        <div
                          key={i}
                          style={{
                            width: "100%",
                            paddingBottom: "100%",
                            position: "relative",
                            background: track.imageUrl ? `url(${track.imageUrl})` : "rgba(29,185,84,0.2)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            overflow: "hidden",
                          }}
                        >
                          {!track.imageUrl && "🎵"}
                        </div>
                      ))}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.playlistName}
                    </h3>
                    <p style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>
                      {p.tracks.length} tracks
                    </p>
                    <p style={{ fontSize: 11, color: "#666" }}>
                      {new Date(p.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs */}
        {activeTab !== "create" && activeTab !== "history" && (
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
