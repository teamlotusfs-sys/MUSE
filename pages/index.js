import { useState, useEffect, useRef } from "react";

async function generatePlaylist(prompt, trackCount = 15) {
  const response = await fetch("/api/generate-playlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, trackCount }),
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
      return {
        imageUrl: data.imageUrl || null,
        previewUrl: data.previewUrl || null,
        spotifyUrl: data.spotifyUrl || null,
      };
    }
  } catch (err) {
    console.error("Failed to fetch artwork:", err);
  }
  return { imageUrl: null, previewUrl: null, spotifyUrl: null };
}

async function getSongOfTheDay() {
  try {
    const response = await fetch("/api/song-of-the-day");
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error("Failed to fetch song of the day:", err);
  }
  return null;
}

function AudioPlayer({ previewUrl, trackTitle }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (!previewUrl) return;
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  if (!previewUrl) {
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#999",
        }}
        title="No preview available"
      >
        🔇
      </div>
    );
  }

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={handlePlayPause}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: isPlaying ? "#00d4ff" : "rgba(0,212,255,0.2)",
          border: "1px solid rgba(0,212,255,0.4)",
          color: isPlaying ? "#000" : "#00d4ff",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          fontWeight: "bold",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isPlaying) {
            e.currentTarget.style.background = "rgba(0,212,255,0.3)";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0,212,255,0.3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isPlaying) {
            e.currentTarget.style.background = "rgba(0,212,255,0.2)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
      
      <div style={{ width: 60, height: 4, background: "rgba(0,212,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
        <div 
          style={{ 
            height: "100%", 
            background: "#00d4ff", 
            width: `${progressPercent}%`,
            transition: "width 0.1s linear"
          }} 
        />
      </div>

      <audio 
        ref={audioRef} 
        src={previewUrl}
        crossOrigin="anonymous"
        onError={(e) => {
          console.error("Audio error:", e);
          setIsPlaying(false);
        }}
      />
    </div>
  );
}

function TrackRow({ track, index }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderRadius: 14,
        background: "rgba(37,99,235,0.08)",
        border: "1px solid rgba(0,212,255,0.15)",
        animation: "slideInTrack 0.5s ease forwards",
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        transition: "all 0.3s",
        backdropFilter: "blur(10px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(37,99,235,0.12)";
        e.currentTarget.style.borderColor = "rgba(0,212,255,0.25)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,212,255,0.1)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(37,99,235,0.08)";
        e.currentTarget.style.borderColor = "rgba(0,212,255,0.15)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Album Art Thumbnail */}
      {track.imageUrl ? (
        <img
          src={track.imageUrl}
          alt={track.title}
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            objectFit: "cover",
            border: "1px solid rgba(0,212,255,0.2)",
            flexShrink: 0,
            boxShadow: "0 4px 16px rgba(0,212,255,0.15)",
          }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(37,99,235,0.2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
            border: "1px solid rgba(0,212,255,0.2)",
          }}
        >
          🎵
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 4,
          }}
        >
          {track.title}
        </div>
        <div
          style={{
            color: "#00d4ff",
            fontSize: 12,
            opacity: 0.7,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.artist}
        </div>
      </div>

      <AudioPlayer previewUrl={track.previewUrl} trackTitle={track.title} />
    </div>
  );
}

function SongOfTheDayCard({ song }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const handlePlayPause = () => {
    if (!song.previewUrl) return;
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(37,99,235,0.1) 100%)",
        border: "1px solid rgba(0,212,255,0.25)",
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        animation: "fadeIn 0.6s ease forwards",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          minHeight: "400px",
          alignItems: "center",
        }}
      >
        {/* Image Side */}
        <div style={{ position: "relative", height: "100%", minHeight: "400px" }}>
          {song.imageUrl ? (
            <img
              src={song.imageUrl}
              alt={song.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(37,99,235,0.2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
              }}
            >
              🎵
            </div>
          )}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(to right, transparent, rgba(10,14,39,0.4))",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Content Side */}
        <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 100,
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.3)",
                marginBottom: 16,
              }}
            >
              <span style={{ color: "#00d4ff", fontSize: 12, fontWeight: 700 }}>
                ✨ SONG OF THE DAY
              </span>
            </div>

            <h2
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              {song.title}
            </h2>

            <p style={{ color: "#00d4ff", fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {song.artist}
            </p>

            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
              {song.description}
            </p>
          </div>

          {song.previewUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={handlePlayPause}
                style={{
                  padding: "16px 32px",
                  borderRadius: 12,
                  background: isPlaying ? "#00d4ff" : "linear-gradient(135deg, #00d4ff, #2563eb)",
                  border: "none",
                  color: isPlaying ? "#000" : "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.3s",
                  boxShadow: "0 8px 24px rgba(0,212,255,0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,212,255,0.35)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,212,255,0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isPlaying ? "⏸ Playing" : "▶ Preview"}
              </button>
              
              <div style={{ width: "100%", height: 4, background: "rgba(0,212,255,0.2)", borderRadius: 2, overflow: "hidden" }}>
                <div 
                  style={{ 
                    height: "100%", 
                    background: "#00d4ff", 
                    width: `${progressPercent}%`,
                    transition: "width 0.1s linear"
                  }} 
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555" }}>
                <span>{Math.floor(currentTime)}s</span>
                <span>{Math.floor(duration)}s</span>
              </div>
            </div>
          )}

          <audio 
            ref={audioRef} 
            src={song.previewUrl}
            crossOrigin="anonymous"
            onError={(e) => {
              console.error("Audio error:", e);
              setIsPlaying(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Epic Generation Screen Component
function GenerationScreen({ prompt, trackCount }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 25;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const stages = [
    { label: "Analyzing mood...", icon: "🎯", delay: 0 },
    { label: "Searching 1M+ tracks...", icon: "🔍", delay: 2 },
    { label: "Curating perfect flow...", icon: "✨", delay: 4 },
    { label: "Fetching album art...", icon: "🎨", delay: 6 },
    { label: "Getting previews ready...", icon: "🎵", delay: 8 },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e27",
        fontFamily: "'DM Sans', sans-serif",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,700;1,300&display=swap');
        
        @keyframes fadeIn { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        
        @keyframes slideUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,212,255,0.4), inset 0 0 20px rgba(0,212,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(0,212,255,0.6), inset 0 0 30px rgba(0,212,255,0.2); }
        }
        
        @keyframes stage-pop {
          0% { opacity: 0; scale: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.6; scale: 1; }
        }
      `}</style>

      {/* Animated Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,212,255,0.15) 0%, transparent 50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "-200px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            left: "-200px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            animation: "float 8s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Main Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        {/* Central Glow Circle */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,212,255,0.3), rgba(0,212,255,0.05))",
            marginBottom: 40,
            animation: "pulse-glow 3s ease-in-out infinite",
            border: "2px solid rgba(0,212,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 80,
          }}
        >
          ✨
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 48,
            fontWeight: 300,
            marginBottom: 16,
            animation: "slideUp 0.6s ease 0.1s forwards",
            opacity: 0,
            letterSpacing: "-1px",
            color: "#fff",
          }}
        >
          Crafting your vibe...
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "#00d4ff",
            fontSize: 16,
            maxWidth: 500,
            marginBottom: 40,
            animation: "slideUp 0.6s ease 0.2s forwards",
            opacity: 0,
            lineHeight: 1.6,
          }}
        >
          "{prompt.substring(0, 50)}{prompt.length > 50 ? "..." : ""}"
        </p>

        {/* Progress Bar */}
        <div style={{ width: "100%", maxWidth: 400, marginBottom: 40 }}>
          <div
            style={{
              height: 2,
              background: "rgba(0,212,255,0.2)",
              borderRadius: 1,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #00d4ff, #2563eb)",
                width: `${progress}%`,
                transition: "width 0.3s ease",
                boxShadow: "0 0 20px rgba(0,212,255,0.5)",
              }}
            />
          </div>
          <p style={{ color: "#666", fontSize: 12 }}>{Math.floor(progress)}%</p>
        </div>

        {/* Stage Indicators */}
        <div style={{ animation: "slideUp 0.6s ease 0.3s forwards", opacity: 0 }}>
          {stages.map((stage, i) => {
            const isActive = progress > stage.delay * 11;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  opacity: isActive ? 1 : 0.3,
                  transition: "all 0.3s ease",
                  transform: isActive ? "translateX(0)" : "translateX(-10px)",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    animation: isActive ? "stage-pop 0.6s ease" : "none",
                  }}
                >
                  {stage.icon}
                </span>
                <span
                  style={{
                    color: isActive ? "#00d4ff" : "#555",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "color 0.3s ease",
                  }}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Floating Notes */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            gap: 40,
            animation: "slideUp 0.6s ease 0.4s forwards",
            opacity: 0,
          }}
        >
          {["🎵", "🎶", "🎼"].map((note, i) => (
            <div
              key={i}
              style={{
                fontSize: 28,
                opacity: 0.3,
                animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
              }}
            >
              {note}
            </div>
          ))}
        </div>
      </div>
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
  const [trackCount, setTrackCount] = useState(15);
  const [activeTab, setActiveTab] = useState("generator");
  const [songOfTheDay, setSongOfTheDay] = useState(null);

  const textareaRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (activeTab === "sotd") {
      loadSongOfTheDay();
    }
  }, [activeTab]);

  async function loadSongOfTheDay() {
    try {
      const song = await getSongOfTheDay();
      if (song) {
        setSongOfTheDay(song);
      }
    } catch (err) {
      console.error("Error loading song of the day:", err);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setPhase("generating");

    try {
      const result = await generatePlaylist(prompt, trackCount);

      setLoadingArtwork(true);
      const tracksWithArtwork = await Promise.all(
        result.tracks.map(async (track) => {
          const { imageUrl, previewUrl, spotifyUrl } = await searchSpotifyForArtwork(
            track.artist,
            track.title
          );
          return { ...track, imageUrl, previewUrl, spotifyUrl };
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

    const csvContent = playlist.tracks.map((track) => `${track.artist}\t${track.title}`).join("\n");
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `${playlist.playlistName.replace(/\s+/g, "_")}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function closePlaylist() {
    setPhase("idle");
    setPlaylist(null);
    setPrompt("");
  }

  const examplePrompts = [
    "late night city drive with neon lights",
    "falling in love slowly",
    "2000s indie rock for studying",
    "dark ambient for focused work",
    "summer morning vibes",
  ];

  // Epic Generation Screen
  if (phase === "generating") {
    return <GenerationScreen prompt={prompt} trackCount={trackCount} />;
  }

  // Playlist View
  if (playlist && phase === "done") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0e27",
          fontFamily: "'DM Sans', sans-serif",
          color: "#fff",
          overflow: "auto",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,700;1,300&display=swap');
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInTrack { 
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 50%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 900,
            margin: "0 auto",
            padding: isMobile ? "20px 16px 80px" : "40px 24px 80px",
          }}
        >
          <button
            onClick={closePlaylist}
            style={{
              position: "fixed",
              top: isMobile ? 16 : 24,
              right: isMobile ? 16 : 24,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.2)",
              color: "#00d4ff",
              fontSize: 24,
              cursor: "pointer",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,212,255,0.2)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(0,212,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,212,255,0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ✕
          </button>

          <div style={{ animation: "fadeIn 0.5s ease forwards" }}>
            <div style={{ marginBottom: isMobile ? 32 : 48, marginTop: isMobile ? 40 : 0 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: 100,
                  background: "rgba(0,212,255,0.15)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  marginBottom: 16,
                }}
              >
                <span style={{ color: "#00d4ff", fontSize: 12, fontWeight: 600 }}>
                  ✓ Playlist Generated
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: isMobile ? 32 : 48,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-1px",
                  color: "#fff",
                }}
              >
                {playlist.playlistName}
              </h1>
              <p style={{ color: "#aaa", fontSize: isMobile ? 14 : 15, maxWidth: 600, lineHeight: 1.6 }}>
                {playlist.description}
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(0,212,255,0.1)",
                border: "1px solid rgba(0,212,255,0.2)",
                marginBottom: 24,
                fontSize: 13,
                color: "#00d4ff",
              }}
            >
              <span>🎵</span>
              <span>{playlist.tracks.length} tracks curated</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: isMobile ? 32 : 48 }}>
              {playlist.tracks.map((track, i) => (
                <TrackRow key={i} track={track} index={i} />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: isMobile ? "wrap" : "nowrap",
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                padding: isMobile ? "16px" : "24px",
                background: "linear-gradient(to top, rgba(10,14,39,0.95), transparent)",
                zIndex: 50,
              }}
            >
              <button
                onClick={downloadCSV}
                style={{
                  flex: isMobile ? 1 : "auto",
                  padding: isMobile ? "14px 20px" : "14px 32px",
                  borderRadius: 100,
                  background: "linear-gradient(135deg, #00d4ff, #2563eb)",
                  color: "#000",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  boxShadow: "0 8px 24px rgba(0,212,255,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,212,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,212,255,0.2)";
                }}
              >
                📥 Download
              </button>

              <a
                href="https://www.tunemymusic.com/transfer"
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: isMobile ? 1 : "auto",
                  padding: isMobile ? "14px 20px" : "14px 32px",
                  borderRadius: 100,
                  background: "rgba(0,212,255,0.2)",
                  color: "#00d4ff",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 700,
                  border: "1px solid rgba(0,212,255,0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  textDecoration: "none",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.2)";
                }}
              >
                🎵 Import to Spotify
              </a>

              <button
                onClick={closePlaylist}
                style={{
                  flex: isMobile ? 1 : "auto",
                  padding: isMobile ? "14px 20px" : "14px 32px",
                  borderRadius: 100,
                  border: "1px solid rgba(0,212,255,0.15)",
                  background: "rgba(0,212,255,0.05)",
                  color: "#00d4ff",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,212,255,0.05)";
                }}
              >
                ✨ Create New
              </button>
            </div>

            <div style={{ height: 80 }} />
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0e27",
        fontFamily: "'DM Sans', sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,700;1,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #00d4ff; border-radius: 3px; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInTrack {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        textarea:focus { outline: none; }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(0,212,255,0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00d4ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(0,212,255,0.5);
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 50%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: isMobile ? "24px 16px 60px" : "40px 24px 80px",
        }}
      >
        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: isMobile ? 32 : 48,
            animation: "fadeSlideIn 0.6s ease forwards",
            borderBottom: "1px solid rgba(0,212,255,0.1)",
            paddingBottom: 16,
          }}
        >
          <button
            onClick={() => setActiveTab("generator")}
            style={{
              padding: "10px 20px",
              background: activeTab === "generator" ? "rgba(0,212,255,0.2)" : "transparent",
              border: activeTab === "generator" ? "1px solid rgba(0,212,255,0.4)" : "none",
              color: activeTab === "generator" ? "#00d4ff" : "#666",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "generator") {
                e.currentTarget.style.color = "#00d4ff";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "generator") {
                e.currentTarget.style.color = "#666";
              }
            }}
          >
            🎵 Playlist Generator
          </button>
          <button
            onClick={() => setActiveTab("sotd")}
            style={{
              padding: "10px 20px",
              background: activeTab === "sotd" ? "rgba(0,212,255,0.2)" : "transparent",
              border: activeTab === "sotd" ? "1px solid rgba(0,212,255,0.4)" : "none",
              color: activeTab === "sotd" ? "#00d4ff" : "#666",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "sotd") {
                e.currentTarget.style.color = "#00d4ff";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "sotd") {
                e.currentTarget.style.color = "#666";
              }
            }}
          >
            ✨ Song of the Day
          </button>
        </div>

        {/* Song of the Day Tab */}
        {activeTab === "sotd" && (
          <div style={{ animation: "fadeSlideIn 0.6s ease forwards" }}>
            {songOfTheDay ? (
              <SongOfTheDayCard song={songOfTheDay} />
            ) : (
              <div
                style={{
                  padding: "40px",
                  borderRadius: 20,
                  background: "rgba(37,99,235,0.08)",
                  border: "1px solid rgba(0,212,255,0.15)",
                  textAlign: "center",
                  color: "#aaa",
                }}
              >
                Loading song of the day...
              </div>
            )}
          </div>
        )}

        {/* Generator Tab */}
        {activeTab === "generator" && (
          <div style={{ animation: "fadeSlideIn 0.5s ease forwards" }}>
            <div style={{ marginBottom: isMobile ? 24 : 40 }}>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: isMobile ? 32 : 48,
                  fontWeight: 300,
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                  marginBottom: 12,
                  color: "#fff",
                }}
              >
                Forge your
                <br />
                <span style={{ color: "#00d4ff", fontStyle: "italic", fontWeight: 400 }}>
                  perfect playlist
                </span>
              </h1>
              <p style={{ color: "#aaa", fontSize: isMobile ? 14 : 15, maxWidth: 500 }}>
                Tell us a mood, moment, or vibe — our AI will craft a unique playlist with album artwork and previews.
              </p>
            </div>

            {/* Song Count Slider */}
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <label
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#00d4ff",
                  }}
                >
                  Number of Songs
                </label>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#00d4ff",
                    background: "rgba(0,212,255,0.15)",
                    padding: "4px 12px",
                    borderRadius: 6,
                  }}
                >
                  {trackCount}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={trackCount}
                onChange={(e) => setTrackCount(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(0,212,255,0.2)",
                  outline: "none",
                  WebkitAppearance: "none",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#666",
                }}
              >
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Input Box */}
            <div
              style={{
                border: "1px solid rgba(0,212,255,0.15)",
                borderRadius: 16,
                background: "rgba(37,99,235,0.05)",
                overflow: "hidden",
                transition: "all 0.3s",
                marginBottom: 24,
                backdropFilter: "blur(10px)",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,212,255,0.4)";
                e.currentTarget.style.background = "rgba(37,99,235,0.08)";
                e.currentTarget.style.boxShadow = "0 0 24px rgba(0,212,255,0.1)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,212,255,0.15)";
                e.currentTarget.style.background = "rgba(37,99,235,0.05)";
                e.currentTarget.style.boxShadow = "none";
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: isMobile ? "12px 16px" : "16px 24px",
                  borderTop: "1px solid rgba(0,212,255,0.05)",
                  background: "rgba(0,212,255,0.02)",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  gap: isMobile ? 8 : 0,
                }}
              >
                <span style={{ color: "#555", fontSize: isMobile ? 10 : 11, order: isMobile ? 2 : 0 }}>
                  ⌘↵ or Ctrl↵ to generate
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || phase !== "idle"}
                  style={{
                    padding: isMobile ? "12px 24px" : "12px 32px",
                    borderRadius: 100,
                    border: "none",
                    background:
                      !prompt.trim() || phase !== "idle"
                        ? "rgba(0,212,255,0.2)"
                        : "linear-gradient(135deg, #00d4ff, #2563eb)",
                    color: !prompt.trim() || phase !== "idle" ? "#555" : "#fff",
                    fontFamily: "inherit",
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 700,
                    cursor: !prompt.trim() || phase !== "idle" ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    opacity: !prompt.trim() || phase !== "idle" ? 0.5 : 1,
                    order: isMobile ? 1 : 0,
                    width: isMobile ? "100%" : "auto",
                    boxShadow:
                      !prompt.trim() || phase !== "idle"
                        ? "none"
                        : "0 8px 24px rgba(0,212,255,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    if (!(!prompt.trim() || phase !== "idle")) {
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,212,255,0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(!prompt.trim() || phase !== "idle")) {
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,212,255,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {phase === "generating" ? "Generating..." : "✨ Forge"}
                </button>
              </div>
            </div>

            {/* Example Prompts */}
            {phase === "idle" && (
              <div style={{ marginBottom: isMobile ? 24 : 40 }}>
                <p
                  style={{
                    color: "#555",
                    fontSize: 11,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Try one of these
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                  }}
                >
                  {examplePrompts.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "1px solid rgba(0,212,255,0.15)",
                        background: "rgba(37,99,235,0.06)",
                        color: "#00d4ff",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "left",
                        backdropFilter: "blur(10px)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0,212,255,0.15)";
                        e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,212,255,0.1)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(37,99,235,0.06)";
                        e.currentTarget.style.borderColor = "rgba(0,212,255,0.15)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {phase === "error" && (
              <div
                style={{
                  padding: isMobile ? 16 : 24,
                  borderRadius: 12,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  animation: "fadeSlideIn 0.4s ease forwards",
                }}
              >
                <p style={{ color: "#ff6b6b", fontSize: isMobile ? 13 : 14, marginBottom: 12 }}>
                  {errorMsg}
                </p>
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
        )}
      </div>
    </div>
  );
}
              
