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
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 16 }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: 2,
            borderRadius: 1,
            background: active ? "#1DB954" : "#333",
            height: active ? undefined : 4,
            animation: active ? `wave ${0.8 + i * 0.15}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { height: 3px; }
          to { height: 16px; }
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
            flexShrink: 0,
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
            flexShrink: 0,
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
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState("idle");
  const [playlist, setPlaylist] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingArtwork, setLoadingArtwork] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const textareaRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setPhase("generating");
    setPlaylist(null);
    setErrorMsg("");
    setLoadingArtwork(false);

    try {
      const result = await generatePlaylist(prompt);
      
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

  function downloadCSV() {
    if (!playlist) return;

    const csvContent = playlist.tracks.map(track => `${track.artist}\t${track.title}`).join('\n');
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
        body { background: #0a0a0a; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.08) 0%, transparent 50%)",
      }} />

      <div style={{ 
        position: "relative", 
        zIndex: 1, 
        maxWidth: 900, 
        margin: "0 auto", 
        padding: isMobile ? "24px 16px 60px" : "40px 24px 80px"
      }}>
        
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isMobile ? 32 : 48,
          animation: "fadeSlideIn 0.6s ease forwards",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            <Waveform active={phase === "generating"} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? 24 : 28, fontWeight: 700 }}>
              TuneForge
            </span>
          </div>
        </div>

        {/* Create Section */}
        <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
          <div style={{ marginBottom: isMobile ? 24 : 40 }}>
            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: isMobile ? 32 : 48,
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              marginBottom: 12,
            }}>
              Forge your
              <br />
              <span style={{ color: "#1DB954", fontStyle: "italic" }}>perfect playlist</span>
            </h1>
            <p style={{ color: "#777", fontSize: isMobile ? 14 : 15, maxWidth: 500 }}>
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
              placeholder="e.g., late night drive through neon streets, Sunday morning coffee vibes..."
              style={{
                width: "100%",
                minHeight: isMobile ? 100 : 120,
                padding: isMobile ? 16 : 24,
                background: "transparent",
                border: "none",
                resize: "none",
                color: "#fff",
                fontSize: isMobile ? 15 : 16,
                lineHeight: 1.6,
                fontFamily: "inherit",
              }}
            />
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "12px 16px" : "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
              flexWrap: isMobile ? "wrap" : "nowrap",
              gap: isMobile ? 8 : 0,
            }}>
              <span style={{ color: "#555", fontSize: isMobile ? 10 : 11, order: isMobile ? 2 : 0 }}>⌘↵ or Ctrl↵ to generate</span>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || phase === "generating"}
                style={{
                  padding: isMobile ? "12px 24px" : "12px 32px",
                  borderRadius: 100,
                  border: "none",
                  background: "#1DB954",
                  color: "#000",
                  fontFamily: "inherit",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: (!prompt.trim() || phase === "generating") ? 0.4 : 1,
                  order: isMobile ? 1 : 0,
                  width: isMobile ? "100%" : "auto",
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
            <div style={{ marginBottom: isMobile ? 24 : 40 }}>
              <p style={{ color: "#666", fontSize: 11, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Try one of these
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
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
              <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? 24 : 32, fontWeight: 700, marginBottom: 8 }}>
                  {playlist.playlistName}
                </h2>
                <p style={{ color: "#777", fontSize: isMobile ? 13 : 14 }}>{playlist.description}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: isMobile ? 24 : 32 }}>
                {playlist.tracks.map((track, i) => (
                  <TrackRow key={i} track={track} index={i} />
                ))}
              </div>

              <div style={{
                padding: isMobile ? 16 : 24,
                borderRadius: 12,
                background: "rgba(29,185,84,0.08)",
                border: "1px solid rgba(29,185,84,0.25)",
                animation: "fadeSlideIn 0.5s ease forwards",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ color: "#1DB954", fontWeight: 700, fontSize: isMobile ? 13 : 14, marginBottom: 4 }}>
                      ✓ Playlist forged!
                    </div>
                    <div style={{ color: "#777", fontSize: isMobile ? 12 : 13 }}>
                      {playlist.tracks.length} tracks with artwork
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
                    <button
                      onClick={downloadCSV}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: isMobile ? "12px 20px" : "12px 24px",
                        borderRadius: 100,
                        background: "#1DB954",
                        color: "#000",
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontFamily: "inherit",
                        flex: isMobile ? 1 : "auto",
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
                        padding: isMobile ? "12px 20px" : "12px 24px",
                        borderRadius: 100,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#aaa",
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 600,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flex: isMobile ? 1 : "auto",
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
                      ✨ New
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {phase === "error" && (
            <div style={{
              padding: isMobile ? 16 : 24,
              borderRadius: 12,
              background: "rgba(231,76,60,0.1)",
              border: "1px solid rgba(231,76,60,0.25)",
              animation: "fadeSlideIn 0.4s ease forwards",
            }}>
              <p style={{ color: "#ff6b6b", fontSize: isMobile ? 13 : 14, marginBottom: 12 }}>{errorMsg}</p>
              <button
                onClick={() => setPhase("idle")}
                style={{
                  color: "#ff6b6b",
                  fontSize: isMobile ? 12 : 13,
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
      </div>
    </div>
  );
}
