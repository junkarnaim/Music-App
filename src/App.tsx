import { useState, useEffect, ChangeEvent } from "react";
import { Track, Playlist } from "./types";
import { PREDEFINED_TRACKS } from "./predefinedTracks";
import { globalAudioEngine } from "./audioEngine";
import AudioVisualizer from "./components/AudioVisualizer";
import TrackSequencer from "./components/TrackSequencer";
import VirtualKeyboard from "./components/VirtualKeyboard";
import AIComposer from "./components/AIComposer";
import PlaylistManager from "./components/PlaylistManager";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Disc,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  Heart,
  Globe,
  Radio,
  Sliders,
  FileText,
  Search,
  Key,
  ExternalLink,
  Lock,
  Settings
} from "lucide-react";

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Spotify online streaming states
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([]);
  const [isSpotifySearching, setIsSpotifySearching] = useState(false);
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [spotifyConfigMessage, setSpotifyConfigMessage] = useState("");
  const [activeSourceTab, setActiveSourceTab] = useState<"synth" | "spotify">("synth");
  
  // Custom user overridden Spotify Keys inside App state/localStorage
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem("custom_spotify_client_id") || "");
  const [customClientSecret, setCustomClientSecret] = useState(() => localStorage.getItem("custom_spotify_client_secret") || "");
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Core floating header-bar search states
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Audio and visual playback synchronization states
  const [playing, setPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Tab/Active view within dashboard (dashboard / composition / lyrics)
  const [activeTab, setActiveTab] = useState<"stream" | "lyrics" | "keyboard">("stream");

  // On initial mount, load curated and custom storage tracks
  useEffect(() => {
    // 1. Fetch preloaded songs
    const initialTracks = [...PREDEFINED_TRACKS];

    // 2. Load custom AI composed tracks from localStorage
    try {
      const savedTracks = localStorage.getItem("aurastream_custom_tracks");
      if (savedTracks) {
        const parsedCustom: Track[] = JSON.parse(savedTracks);
        // Deduplicate and append
        parsedCustom.forEach((customTrack) => {
          if (!initialTracks.some((t) => t.id === customTrack.id)) {
            initialTracks.push(customTrack);
          }
        });
      }
    } catch (e) {
      console.error("Failed to restore cached custom composition tracks", e);
    }
    setTracks(initialTracks);
    setCurrentTrack(initialTracks[0]);

    // 3. Load custom playlists
    try {
      const savedPlaylists = localStorage.getItem("aurastream_playlists");
      if (savedPlaylists) {
        setPlaylists(JSON.parse(savedPlaylists));
      }
    } catch (e) {
      console.error("Failed to restore playlists", e);
    }

    // 4. Set initial engine volume configuration
    globalAudioEngine.setVolume(70 / 100);

    // 5. Connect callbacks into the core globalAudioEngine
    globalAudioEngine.setCallbacks(
      (step) => {
        setActiveStep(step);
      },
      (isPlaying) => {
        setPlaying(isPlaying);
      }
    );

    return () => {
      globalAudioEngine.stop();
    };
  }, []);

  // Sync Spotify status on mount or custom key changes
  useEffect(() => {
    const fetchSpotifyConfig = async () => {
      try {
        const url = new URL("/api/spotify/config", window.location.origin);
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          // Configured if either backend env or custom keys are set
          setSpotifyConfigured(data.isConfigured || !!(customClientId && customClientSecret));
          setSpotifyConfigMessage(
            (data.isConfigured || !!(customClientId && customClientSecret))
              ? "Spotify API streaming connected successfully."
              : "Spotify credentials not set. Running in catalog fallback sandbox."
          );
        }
      } catch (err) {
        console.error("Failed to query Spotify status on proxy:", err);
      }
    };
    fetchSpotifyConfig();
  }, [customClientId, customClientSecret]);

  const handleSaveCustomKeys = (cid: string, csec: string) => {
    setCustomClientId(cid);
    setCustomClientSecret(csec);
    localStorage.setItem("custom_spotify_client_id", cid);
    localStorage.setItem("custom_spotify_client_secret", csec);
    setShowConfigPanel(false);
  };

  const handleSpotifySearch = async (e?: any, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery !== undefined ? customQuery : spotifySearchQuery;
    if (!queryToUse.trim()) return;

    setIsSpotifySearching(true);
    try {
      const url = new URL("/api/spotify/search", window.location.origin);
      url.searchParams.append("q", queryToUse.trim());
      if (customClientId) {
        url.searchParams.append("clientId", customClientId.trim());
      }
      if (customClientSecret) {
        url.searchParams.append("clientSecret", customClientSecret.trim());
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Proxy search responded with status error: " + res.status);
      }
      const data = await res.json();
      setSpotifyResults(data.tracks || []);
    } catch (err) {
      console.error("Spotify search trigger error:", err);
    } finally {
      setIsSpotifySearching(false);
    }
  };

  // Sync volume modifications to synthesizer
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    globalAudioEngine.setVolume(val / 100);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      globalAudioEngine.setVolume(volume / 100);
    } else {
      setIsMuted(true);
      globalAudioEngine.setVolume(0);
    }
  };

  // Playback control functions
  const handlePlayPause = () => {
    if (!currentTrack) return;
    globalAudioEngine.togglePlay(currentTrack);
  };

  const filterTracksByPlaylist = () => {
    if (selectedPlaylistId === null) return tracks;
    const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);
    if (!activePlaylist) return tracks;
    return tracks.filter((t) => activePlaylist.trackIds.includes(t.id));
  };

  const visibleTracks = filterTracksByPlaylist();

  const handleNextTrack = () => {
    if (visibleTracks.length <= 1 || !currentTrack) return;
    const currentIdx = visibleTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = (currentIdx + 1) % visibleTracks.length;
    const nextTrack = visibleTracks[nextIdx];
    
    setCurrentTrack(nextTrack);
    if (playing) {
      globalAudioEngine.start(nextTrack);
    }
  };

  const handlePrevTrack = () => {
    if (visibleTracks.length <= 1 || !currentTrack) return;
    const currentIdx = visibleTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = (currentIdx - 1 + visibleTracks.length) % visibleTracks.length;
    const prevTrack = visibleTracks[prevIdx];
    
    setCurrentTrack(prevTrack);
    if (playing) {
      globalAudioEngine.start(prevTrack);
    }
  };

  const handleTrackSelect = (track: Track) => {
    // Register the Spotify track dynamically if it is not already in the main catalog
    if (!tracks.some((t) => t.id === track.id)) {
      const updated = [...tracks, track];
      setTracks(updated);
      
      try {
        const customOnes = updated.filter((t) => t.isAIComposed || t.isSpotify);
        localStorage.setItem("aurastream_custom_tracks", JSON.stringify(customOnes));
      } catch (e) {
        console.error("Local storage error during Spotify registering", e);
      }
    }
    setCurrentTrack(track);
    globalAudioEngine.start(track);
  };

  // Persistent updates on sequencer cell manipulation
  const handleModifyTrackMelody = (updatedTrack: Track) => {
    // 1. Update active state array
    const updatedTracks = tracks.map((t) => (t.id === updatedTrack.id ? updatedTrack : t));
    setTracks(updatedTracks);
    setCurrentTrack(updatedTrack);

    // 2. If already playing, hot-reconfigure sequence grid in audio synth time thread
    if (playing && globalAudioEngine.getPlayingTrackId() === updatedTrack.id) {
      // Re-triggering start without resetting play position updates timing triggers instantly
      globalAudioEngine.start(updatedTrack);
    }

    // 3. Cache custom composition grids in local storage for full state persistence
    if (updatedTrack.isAIComposed) {
      try {
        const customTracks = updatedTracks.filter((t) => t.isAIComposed);
        localStorage.setItem("aurastream_custom_tracks", JSON.stringify(customTracks));
      } catch (e) {
        console.error("Local storage allocation error", e);
      }
    }
  };

  // Handle addition of freshly composed Gemini tracker maps
  const handleAddNewAIComposition = (newTrack: Track) => {
    const updated = [newTrack, ...tracks];
    setTracks(updated);
    setCurrentTrack(newTrack);

    // Persist list
    try {
      const customOnes = updated.filter((t) => t.isAIComposed);
      localStorage.setItem("aurastream_custom_tracks", JSON.stringify(customOnes));
    } catch (e) {
      console.error(e);
    }

    // Auto-focus and start synthesizer flow
    globalAudioEngine.stop();
    setTimeout(() => {
      globalAudioEngine.start(newTrack);
    }, 150);
  };

  // Playlist handlers
  const handleCreatePlaylist = (name: string) => {
    const newList: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      trackIds: []
    };
    const updated = [...playlists, newList];
    setPlaylists(updated);
    localStorage.setItem("aurastream_playlists", JSON.stringify(updated));
  };

  const handleDeletePlaylist = (id: string) => {
    const filtered = playlists.filter((p) => p.id !== id);
    setPlaylists(filtered);
    localStorage.setItem("aurastream_playlists", JSON.stringify(filtered));
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
    }
  };

  const handleAddTrackToPlaylist = (playlistId: string, trackId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId && !p.trackIds.includes(trackId)) {
        return { ...p, trackIds: [...p.trackIds, trackId] };
      }
      return p;
    });
    setPlaylists(updated);
    localStorage.setItem("aurastream_playlists", JSON.stringify(updated));
  };

  // Extract lyrics stanzas and scroll/illumination triggers
  const renderLyricsContent = () => {
    if (!currentTrack) return null;
    const lines = currentTrack.lyrics.split("\n");
    return (
      <div className="flex flex-col gap-3 py-2 text-center max-h-[380px] overflow-y-auto pr-1">
        {lines.map((line, idx) => {
          const isHeader = line.startsWith("[") && line.endsWith("]");
          const stepHighlight = Math.floor(activeStep / 4) === idx % 4; // Simple soft reactive illumination
          return (
            <p
              key={idx}
              className={`text-sm transition-all duration-300 font-medium ${
                isHeader
                  ? "text-indigo-400/60 font-mono tracking-wider text-[11px] uppercase pt-3"
                  : stepHighlight && playing
                  ? "text-yellow-300 font-bold blur-[0.2px] scale-102"
                  : "text-white/60"
              }`}
            >
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  const colors = currentTrack?.colors || ["#8b5cf6", "#ec4899", "#08080c"];
  const dominantBg = `radial-gradient(circle at 0% 0%, ${colors[0]}15 0%, transparent 60%), radial-gradient(circle at 100% 100%, ${colors[1]}15 0%, transparent 60%), #08080c`;

  return (
    <div
      className="min-h-screen text-slate-100 font-sans transition-all duration-1000 overflow-x-hidden flex flex-col justify-between"
      style={{ background: dominantBg }}
      id="root-music-stream-app"
    >
      {/* 1. TOP HEADER NAVIGATION RAIL */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02] backdrop-blur-xl z-30 select-none">
        
        {/* Core application title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <Radio className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-white tracking-wide">
              SynthStreamer
            </span>
            <span className="text-[9px] font-mono font-medium text-pink-400 block -mt-1 leading-none">
              v2.5 Frosted Glass Suite
            </span>
          </div>
        </div>

        {/* PROMINENT ONLINE MUSIC SEARCH BAR & CASCADING DROPDOWN */}
        <div className="flex-1 max-w-sm md:max-w-md mx-6 relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSpotifySearch(undefined, spotifySearchQuery);
              setActiveSourceTab("spotify");
              setShowSearchDropdown(true);
            }} 
            className="relative flex items-center"
          >
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
            <input
              id="top-online-search-bar"
              type="text"
              placeholder="Search Spotify, Artist, Album, Genre..."
              value={spotifySearchQuery}
              onChange={(e) => {
                setSpotifySearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full bg-[#12121e]/85 hover:bg-[#161625]/95 border border-white/10 focus:border-emerald-500/70 rounded-full pl-10 pr-24 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-none">
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase scale-90">
                Online Catalog
              </span>
            </div>
          </form>

          {/* Cascading Floating Dropdown Results Menu */}
          {showSearchDropdown && (spotifySearchQuery.trim() || spotifyResults.length > 0) && (
            <div className="absolute top-[44px] left-0 right-0 max-h-[380px] overflow-y-auto bg-[#0d0d17]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 space-y-2 z-50">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5 px-1 select-none">
                <span className="text-[10px] font-mono font-semibold text-emerald-400 flex items-center gap-1 uppercase">
                  <Globe className="w-3 h-3 animate-pulse" />
                  Spotify Cloud Search
                </span>
                <button
                  type="button"
                  onClick={() => setShowSearchDropdown(false)}
                  className="text-[9px] font-mono text-white/40 hover:text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition cursor-pointer"
                >
                  Close
                </button>
              </div>

              {isSpotifySearching ? (
                <div className="text-center py-8 text-xs text-white/40 flex flex-col items-center justify-center gap-1.5 font-mono">
                  <span className="w-4 h-4 rounded-full border border-emerald-400 border-t-transparent animate-spin inline-block" />
                  Searching database...
                </div>
              ) : spotifyResults.length > 0 ? (
                <div className="space-y-1">
                  {spotifyResults.map((result) => {
                    const isSelected = currentTrack?.id === result.id;
                    const isPlayingResult = isSelected && playing;
                    return (
                      <div
                        key={result.id}
                        onClick={() => {
                          handleTrackSelect(result);
                        }}
                        className={`p-1.5 rounded-xl flex items-center justify-between border transition cursor-pointer ${
                          isSelected 
                            ? "bg-white/[0.08] border-emerald-500/20" 
                            : "bg-transparent border-transparent hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {result.albumImg && (
                            <img 
                              src={result.albumImg} 
                              className="w-8.5 h-8.5 rounded-lg object-cover flex-shrink-0" 
                              referrerPolicy="no-referrer"
                              alt={result.title}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-white truncate leading-tight">
                              {result.title}
                            </div>
                            <div className="text-[9px] text-white/40 truncate leading-tight mt-0.5">
                              {result.artist}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isPlayingResult ? (
                            <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/25">
                              On Air
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-white/30 truncate max-w-[50px] hidden sm:inline">
                              Stream
                            </span>
                          )}
                          <div
                            className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                              isPlayingResult
                                ? "bg-emerald-500 border-emerald-500 text-black"
                                : "bg-white/5 border-white/5 text-emerald-400"
                            }`}
                          >
                            {isPlayingResult ? (
                              <Pause className="w-2.5 h-2.5 fill-current" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-[11px] text-white/30 flex flex-col items-center gap-1 font-mono">
                  <span>Press enter to search online tracks.</span>
                  <span className="text-[9px] text-white/20">
                    {spotifyConfigured ? "Connected with credentials" : "Fallback Offline Sandbox"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informational UTC clock and local metadata */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-white/40">
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            <Globe className="w-3 text-white/50" />
            <span className="text-[10px]">2026-05-26 15:15 UTC</span>
          </div>
          <span className="text-[10px] text-white/20">|</span>
          <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1 leading-none pr-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 block" />
            cloud database online
          </span>
        </div>
      </header>

      {/* 2. MAIN STREAM WORKSPACE DOCK */}
      <main className="max-w-[1300px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 content-start z-10">
        
        {/* LEFT COLUMN: Track catalogs and Playlists */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* TRACK DIRECTORY PANELS */}
          <div className="frosted-glass p-5 rounded-2xl space-y-4">
            
            {/* Tab Selectors */}
            <div className="flex border-b border-white/5 pb-1 gap-4 select-none">
              <button
                id="tab-select-synth"
                onClick={() => setActiveSourceTab("synth")}
                className={`text-xs font-semibold pb-2 border-b-2 transition ${
                  activeSourceTab === "synth"
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                } cursor-pointer`}
              >
                In-Browser Synths
              </button>
              <button
                id="tab-select-spotify"
                onClick={() => setActiveSourceTab("spotify")}
                className={`text-xs font-semibold pb-2 border-b-2 transition ${
                  activeSourceTab === "spotify"
                    ? "border-emerald-400 text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                } cursor-pointer flex items-center gap-1`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Spotify Streaming
              </button>
            </div>

            {activeSourceTab === "synth" ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center select-none">
                  <div>
                    <h3 className="text-xs font-semibold text-white/70 tracking-wide">
                      Music Archives
                    </h3>
                    <p className="text-[10px] text-white/40 leading-none mt-1">
                      {selectedPlaylistId ? "Custom Stream Filter" : "Curated Studio Compilations"}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 hover:underline cursor-pointer" onClick={() => setSelectedPlaylistId(null)}>
                    Show All
                  </span>
                </div>

                {/* Direct listings mapping */}
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {visibleTracks.map((t) => {
                    const isSelected = currentTrack?.id === t.id;
                    const isTrackPlaying = isSelected && playing;
                    const primaryCol = t.colors?.[0] || "#6366f1";

                    return (
                      <button
                        key={t.id}
                        id={`track-select-${t.id}`}
                        onClick={() => handleTrackSelect(t)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between border cursor-pointer transition ${
                          isSelected
                            ? "bg-white/[0.04] border-white/10"
                            : "bg-transparent border-transparent hover:bg-white/[0.01]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Cover Art layout */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center relative overflow-hidden flex-shrink-0"
                            style={{
                              background: t.isSpotify && t.albumImg 
                                ? "transparent" 
                                : `linear-gradient(135deg, ${(t.colors?.[0] || "#6366f1")}80 0%, ${(t.colors?.[1] || "#ec4899")}a0 100%)`
                            }}
                          >
                            {t.isSpotify && t.albumImg ? (
                              <img src={t.albumImg} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={t.title} />
                            ) : (
                              <Disc className={`w-4.5 h-4.5 text-white/85 ${isTrackPlaying ? "animate-spin" : ""}`} />
                            )}
                            {isTrackPlaying && (
                              <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white leading-tight tracking-wide truncate flex items-center gap-1">
                              <span className="truncate">{t.title}</span>
                              {t.isSpotify ? (
                                <span className="px-1 py-0.5 rounded text-[7px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono scale-90">
                                  SPOTIFY
                                </span>
                              ) : t.isAIComposed ? (
                                <span className="px-1.5 py-0.5 rounded text-[7px] bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 font-bold uppercase leading-none scale-90">
                                  AI
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[9px] text-white/40 mt-0.5 truncate max-w-[170px]">
                              {t.isSpotify && t.artist ? t.artist : t.description}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[8px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5 block leading-none">
                            {t.bpm} BPM
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {visibleTracks.length === 0 && (
                    <div className="text-center py-8 text-xs text-white/30">
                      No songs in filter. Click "All Catalog" to view.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Spotify streaming catalog pane
              <div className="space-y-3.5">
                <div className="flex justify-between items-center select-none">
                  <div>
                    <h3 className="text-xs font-semibold text-white/85">Spotify Search Engine</h3>
                    <p className="text-[10px] text-white/40 leading-none mt-1">
                      Query and play official Spotify streams
                    </p>
                  </div>
                  
                  {/* Status indicator badge */}
                  <span 
                    onClick={() => setShowConfigPanel(!showConfigPanel)}
                    className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer font-medium hover:bg-white/5 transition flex items-center gap-1 ${
                      spotifyConfigured 
                        ? "text-emerald-400 bg-emerald-950/25 border-emerald-500/20" 
                        : "text-amber-400 bg-amber-950/25 border-amber-500/20"
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${spotifyConfigured ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                    {spotifyConfigured ? "Connected" : "Sandbox Mode"}
                  </span>
                </div>

                {/* Optional Developer custom keys setup drawer */}
                {showConfigPanel && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3 animate-fade-in">
                    <div className="text-[10px] font-mono text-white/60 leading-normal flex items-center gap-1.5 bg-white/5 p-2 rounded border border-white/5">
                      <Key className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>
                        Enter your Spotify Client credentials to enable search. Get yours on the 
                        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-400 underline ml-1 inline-flex items-center gap-0.5">
                          Spotify Developer Dashboard <ExternalLink className="w-2.5 h-2.5" />
                        </a>.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          placeholder="Spotify Client ID"
                          value={customClientId}
                          onChange={(e) => setCustomClientId(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500/55"
                        />
                        <input
                          type="password"
                          placeholder="Spotify Client Secret"
                          value={customClientSecret}
                          onChange={(e) => setCustomClientSecret(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500/55"
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomClientId("");
                            setCustomClientSecret("");
                            localStorage.removeItem("custom_spotify_client_id");
                            localStorage.removeItem("custom_spotify_client_secret");
                            setShowConfigPanel(false);
                          }}
                          className="px-2.5 py-1 bg-red-950/20 hover:bg-red-900/30 text-red-300 rounded text-[10px] cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCustomKeys(customClientId, customClientSecret)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded text-[10px] cursor-pointer"
                        >
                          Save Credentials
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search query input form */}
                <form onSubmit={handleSpotifySearch} className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Chill Synthwave, Cozy Lofi..."
                      value={spotifySearchQuery}
                      onChange={(e) => setSpotifySearchQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/55"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSpotifySearching || !spotifySearchQuery.trim()}
                    className="px-3 py-2 bg-[#1db954] hover:bg-[#1ed760] disabled:bg-white/5 text-black disabled:text-white/20 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Spotify search list results */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 col-span-1 border-t border-white/5 pt-2">
                  {isSpotifySearching ? (
                    <div className="text-center py-8 text-xs text-white/40 flex flex-col items-center justify-center gap-1.5 font-mono">
                      <span className="w-4 h-4 rounded-full border border-emerald-400 border-t-transparent animate-spin inline-block" />
                      Loading live Spotify registry query...
                    </div>
                  ) : spotifyResults.length > 0 ? (
                    spotifyResults.map((result) => {
                      const isSelected = currentTrack?.id === result.id;
                      const isPlayingResult = isSelected && playing;
                      return (
                        <div
                          key={result.id}
                          className={`p-2 rounded-xl flex items-center justify-between border transition bg-white/[0.01] hover:bg-white/[0.03] border-white/5`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {result.albumImg && (
                              <img 
                                src={result.albumImg} 
                                className="w-9 h-9 rounded-lg object-cover flex-shrink-0" 
                                referrerPolicy="no-referrer"
                                alt={result.title}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white leading-tight truncate">
                                {result.title}
                              </div>
                              <div className="text-[9px] text-white/40 mt-0.5 truncate leading-none">
                                {result.artist}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Play search result button */}
                            <button
                              id={`btn-search-play-${result.id}`}
                              onClick={() => handleTrackSelect(result)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                                isPlayingResult
                                  ? "bg-emerald-500 border-emerald-500 text-black"
                                  : "bg-white/5 border-white/5 text-emerald-400 hover:bg-white/10"
                              }`}
                              title="Stream Audio Preview"
                            >
                              {isPlayingResult ? (
                                <Pause className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-[11px] text-white/25">
                      No Spotify tracks yet. Perform online search to stream live audio.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PLAYLIST COMPLIANCE ENGINE */}
          <PlaylistManager
            playlists={playlists}
            tracks={tracks}
            currentTrack={currentTrack}
            onSelectPlaylistId={setSelectedPlaylistId}
            selectedPlaylistId={selectedPlaylistId}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onAddTrackToPlaylist={handleAddTrackToPlaylist}
          />
        </div>

        {/* RIGHT COLUMN: Active visualization and live lyrics, sequencer */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* AI COMPOSER MODULAR UNIT */}
          <AIComposer onTrackComposed={handleAddNewAIComposition} />

          {/* ACTIVE SONG DASHBOARD PANEL */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 frosted-glass p-6 rounded-2xl">
            
            {/* Visualizer output on the left */}
            <div className="space-y-4">
              <AudioVisualizer themeColors={colors} />
              
              {/* Active description card */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-xs font-semibold text-white tracking-wider uppercase mb-1">
                  Synthed Track Details
                </h3>
                <p className="text-xs text-subtle leading-normal">
                  {currentTrack ? currentTrack.description : "No active stream channel focused."}
                </p>
                <div className="flex gap-2.5 mt-3 select-none">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/40">
                    Osc: <strong className="text-white font-normal uppercase">{currentTrack?.synthConfig.oscillatorType}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-white/40">
                    Cutoff: <strong className="text-white font-normal">{currentTrack?.synthConfig.cutoff} Hz</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Scrolling Lyrics panel or technical grid controls on the right */}
            <div className="flex flex-col h-full bg-white/[0.01] backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10 select-none">
                <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  Streaming Lyrics Engine
                </span>
                
                <span className="text-[9px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Synced: Step {activeStep + 1}
                </span>
              </div>
              
              {/* Active render lines */}
              <div className="flex-1 p-6 relative">
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#08080c] via-transparent to-transparent pointer-events-none z-10" />
                
                {renderLyricsContent()}
                
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#08080c] via-transparent to-transparent pointer-events-none z-10" />
              </div>
            </div>

          </div>

          {/* INTERACTIVE TRACK STEP SEQUENCER */}
          {currentTrack && (
            <TrackSequencer
              track={currentTrack}
              onChangeTrack={handleModifyTrackMelody}
              activeStep={activeStep}
            />
          )}

          {/* ON-SCREEN PLAYABLE SYNTH PIANO */}
          <VirtualKeyboard />

        </div>
      </main>

      {/* 3. CORE FLOATING BOTTOM PLAYBACK BAR */}
      <footer className="sticky bottom-0 inset-x-0 bg-[#06060c]/60 backdrop-blur-xl border-t border-white/10 py-4 px-6 gap-4 z-40 flex flex-col md:flex-row items-center justify-between select-none shadow-[0_-15px_30px_rgba(0,0,0,0.5)]">
        
        {/* Track thumbnail details or stream resting status */}
        <div className="flex items-center gap-3.5 w-full md:w-[30%] min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0 border border-white/5 shadow-md"
            style={{
              background: currentTrack?.isSpotify && currentTrack?.albumImg
                ? "transparent"
                : `linear-gradient(135deg, ${colors[0]}80 0%, ${colors[1]}a0 100%)`
            }}
          >
            {currentTrack?.isSpotify && currentTrack?.albumImg ? (
              <img
                src={currentTrack.albumImg}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                style={{ borderRadius: 'inherit' }}
                alt="Album Cover"
              />
            ) : (
              <Disc className={`w-6 h-6 text-white ${playing ? "animate-spin" : ""}`} style={{ animationDuration: "3.5s" }} />
            )}
          </div>
          <div className="min-w-0 leading-tight">
            <h4 className="text-xs font-semibold text-white tracking-wide truncate leading-tight">
              {currentTrack ? currentTrack.title : "Audible pipeline stand-by"}
            </h4>
            <p className="text-[10px] text-white/40 mt-1 truncate max-w-[200px] leading-none">
              {currentTrack?.isSpotify && currentTrack?.artist 
                ? `${currentTrack.artist} • Spotify Stream`
                : currentTrack 
                ? `${currentTrack.mood} • ${currentTrack.bpm} BPM` 
                : "Stream soundwaves"}
            </p>
          </div>
        </div>

        {/* Streaming control triggers */}
        <div className="flex flex-col items-center gap-2 w-full md:w-[40%]">
          <div className="flex items-center gap-4">
            <button
              id="btn-skip-prev"
              onClick={handlePrevTrack}
              className="p-1.5 rounded-full text-white/50 hover:text-white transition hover:bg-white/5 cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              id="btn-playback-toggle"
              onClick={handlePlayPause}
              className="p-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition flex items-center justify-center cursor-pointer shadow-lg"
              title={playing ? "Stop stream" : "Play stream"}
            >
              {playing ? (
                <Pause className="w-5 h-5 fill-current text-black" />
              ) : (
                <Play className="w-5 h-5 fill-current text-black ml-0.5" />
              )}
            </button>
            <button
              id="btn-skip-next"
              onClick={handleNextTrack}
              className="p-1.5 rounded-full text-white/50 hover:text-white transition hover:bg-white/5 cursor-pointer"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* LED Step progress indicator channel */}
          <div className="flex items-center gap-1.5 justify-center py-1 select-none">
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const isPassed = stepIdx <= activeStep;
              const isCurrent = stepIdx === activeStep;
              return (
                <span
                  key={stepIdx}
                  className={`h-1.5 rounded-full transition-all duration-150 ${
                    isCurrent && playing
                      ? "w-4 bg-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                      : isPassed && playing
                      ? "w-2 bg-indigo-500"
                      : "w-1.5 bg-white/10"
                  }`}
                  title={`Step ${stepIdx + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Master Sound Controls */}
        <div className="flex items-center gap-3.5 w-full md:w-[30%] justify-end">
          <div className="flex items-center gap-2 w-32">
            <button
              id="btn-volume-toggle"
              onClick={handleToggleMute}
              className="text-white/50 hover:text-white transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              id="volume-slider-input"
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full accent-indigo-500 bg-white/10 h-1 rounded cursor-pointer outline-none"
            />
          </div>
        </div>

      </footer>
    </div>
  );
}
