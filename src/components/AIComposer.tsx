import { useState, useEffect, FormEvent } from "react";
import { Track } from "../types";
import { Sparkles, Music, Send, Check, AlertCircle, Loader2 } from "lucide-react";

interface AIComposerProps {
  onTrackComposed: (newTrack: Track) => void;
}

const GENRE_STYLES = [
  { id: "lofi", label: "Lofi Beats", desc: "Warm cozy study vibe, triangle shapes" },
  { id: "synthwave", label: "Synthwave", desc: "Retro 80s arcade, punchy sawtooth" },
  { id: "ambient", label: "Cosmic Ambient", desc: "Slower sine drone spaces, delay echo" },
  { id: "chiptune", label: "Chiptune Retro", desc: "8-bit square pulse, fast rhythmic arps" }
];

const COMPOSER_MESSAGES = [
  "Inbound request routed to Gemini synthesizer node...",
  "Initializing digital oscillator wave structures...",
  "Analyzing harmonic progressions. Selecting optimal lofi chord progression templates...",
  "Generating 16-step rhythmic melody trigger arrays in C major / A minor...",
  "Drafting thematic stanzas, lyrics, and song metadata...",
  "Compiling synth envelopes (ADSR), custom filter cutoffs, and delay timings...",
  "Finalizing procedural composition details..."
];

export default function AIComposer({ onTrackComposed }: AIComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("lofi");
  const [composing, setComposing] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Cycle procedural feedback messages during load
  useEffect(() => {
    if (!composing) return;
    setStatusIdx(0);
    
    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev < COMPOSER_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, [composing]);

  const handleCompose = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || composing) return;

    setComposing(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt,
          genre: selectedGenre
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Server failed to initiate composition");
      }

      const data = await res.json();
      
      // Map custom API output response to hydrated track format
      const newTrack: Track = {
        id: `ai-composed-${Date.now()}`,
        title: data.title || `AI Composition in ${selectedGenre}`,
        description: data.description || `Custom generated based on: ${prompt}`,
        bpm: Number(data.bpm) || 85,
        mood: data.mood || "Dynamic",
        lyrics: data.lyrics || "No lyric data retrieved.",
        colors: Array.isArray(data.colors) && data.colors.length >= 3 ? data.colors : ["#f43f5e", "#a855f7", "#090514"],
        chords: Array.isArray(data.chords) && data.chords.length === 4 ? data.chords : ["Am", "F", "C", "G"],
        melody: Array.isArray(data.melody) ? data.melody : [],
        bassline: Array.isArray(data.bassline) && data.bassline.length === 4 ? data.bassline : ["A2", "F2", "C2", "G2"],
        synthConfig: {
          oscillatorType: data.synthConfig?.oscillatorType || "triangle",
          cutoff: Number(data.synthConfig?.cutoff) || 1000,
          resonance: Number(data.synthConfig?.resonance) || 3,
          attack: Number(data.synthConfig?.attack) || 0.05,
          release: Number(data.synthConfig?.release) || 0.4
        },
        isAIComposed: true
      };

      setSuccess(true);
      setTimeout(() => {
        onTrackComposed(newTrack);
        setPrompt("");
        setComposing(false);
        setSuccess(false);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to make call. Check GEMINI_API_KEY environment configuration.");
      setComposing(false);
    }
  };

  return (
    <div className="w-full frosted-glass p-6 rounded-2xl space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-[#8b5cf6]/20 to-[#ec4899]/20 rounded-xl border border-white/10 text-pink-300 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white tracking-wide">
            AI Music co-Creator
          </h2>
          <p className="text-xs text-subtle mt-0.5">
            Describe a feeling, place, or concept. Gemini will compose a fully custom track from scratch, including chords, dynamic step triggers, and song lyrics!
          </p>
        </div>
      </div>

      <form onSubmit={handleCompose} className="space-y-5">
        {/* Genre Style selectors */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">1. Select Synth Engine Preset Style</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {GENRE_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                id={`genre-select-${style.id}`}
                onClick={() => setSelectedGenre(style.id)}
                disabled={composing}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedGenre === style.id
                    ? "bg-white/[0.08] border-white/30 shadow-[0_4px_12px_rgba(255,255,255,0.1)] scale-[1.02]"
                    : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                } ${composing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="text-xs font-semibold text-white">{style.label}</div>
                <div className="text-[10px] text-white/40 mt-1 leading-normal">{style.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Narrative Prompt text input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70" htmlFor="compose-prompt-input">
            2. Describe Your Theme / Lyrics Storyline
          </label>
          <div className="relative">
            <input
              id="compose-prompt-input"
              type="text"
              required
              disabled={composing}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Coding lo-fi beats in a rainy coffee shop, late nocturne vibes..."
              className="w-full bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/70 transition disabled:opacity-50 pr-12"
            />
            <button
              id="btn-trigger-compose"
              type="submit"
              disabled={composing || !prompt.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-white/5 text-white disabled:text-white/20 rounded-lg transition overflow-hidden cursor-pointer"
              title="Compose Song"
            >
              {composing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Loading & Status overlay console panel */}
      {composing && (
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">
              Gemini Synthesist active
            </span>
          </div>
          
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <p className="text-xs font-mono text-indigo-300 animate-fade-in" key={statusIdx}>
              {COMPOSER_MESSAGES[statusIdx]}
            </p>
          </div>
          
          {/* Animated custom visual loader bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${((statusIdx + 1) / COMPOSER_MESSAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state indicator */}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-red-950/20 border border-red-500/10 p-4 rounded-xl text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="text-xs space-y-1">
            <div className="font-semibold">Composition Error</div>
            <p className="opacity-85 text-white/70">{errorMsg}</p>
            <p className="text-[10px] text-white/40 pt-1 leading-normal">
              Make sure your AI Studio API key context is configured in Settings {`>`} Secrets.
            </p>
          </div>
        </div>
      )}

      {/* Success animation card */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-xl text-emerald-300 leading-none">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">Track Composed Successfully! Playing now...</span>
        </div>
      )}
    </div>
  );
}
