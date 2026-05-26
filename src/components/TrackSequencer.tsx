import { useState, useEffect } from "react";
import { Track, MelodyStep } from "../types";
import { globalAudioEngine } from "../audioEngine";
import { Play, RotateCcw, Plus, Trash } from "lucide-react";

interface TrackSequencerProps {
  track: Track;
  onChangeTrack: (updatedTrack: Track) => void;
  activeStep: number;
}

const SCALE_NOTES = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"];

export default function TrackSequencer({ track, onChangeTrack, activeStep }: TrackSequencerProps) {
  const [selectedOctaveOffset, setSelectedOctaveOffset] = useState<number>(0);

  if (track.isSpotify) {
    const primaryColor = "#1db954"; // Spotify corporate green color accent
    return (
      <div className="w-full frosted-glass p-6 rounded-2xl space-y-4 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Spotify Stream Mode — {track.title}
            </h3>
            <p className="text-xs text-emerald-400/80 mt-0.5 font-medium">
              Broadcasting Online Stream • 30-Second High-Quality Audio Link
            </p>
          </div>
        </div>
        
        <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center text-center space-y-4">
          <p className="text-xs text-white/60 max-w-md leading-relaxed">
            Procedural synthesizer midi grids are disabled during live Spotify stream channels.
            Try typing or clicking on the <strong>Virtual Synthesizer Keyboard below</strong> to jam synth feeds on top of the streaming audio in real-time!
          </p>
          
          {track.externalUrl && (
            <a 
              href={track.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-[#1db954] hover:bg-[#1ed760] hover:scale-102 mt-1 duration-200 text-black text-xs font-bold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 shadow"
            >
              Open Official Spotify Track
            </a>
          )}
        </div>
      </div>
    );
  }

  const handleCellClick = (note: string, step: number) => {
    // Check if step already matches this exact note
    const existingIndex = track.melody.findIndex((m) => m.step === step);
    let updatedMelody = [...track.melody];

    if (existingIndex > -1) {
      const currentNoteVal = track.melody[existingIndex].note;
      if (currentNoteVal === note) {
        // Toggle OFF (remove/nullify)
        updatedMelody[existingIndex] = { step, note: null };
      } else {
        // Change note to clicked one
        updatedMelody[existingIndex] = { step, note };
        // Trigger quick audition sound preview
        globalAudioEngine.triggerVirtualKey(note, 0.25);
      }
    } else {
      // Add new note
      updatedMelody.push({ step, note });
      // Trigger quick audition sound preview
      globalAudioEngine.triggerVirtualKey(note, 0.25);
    }

    // Double check we have all 16 steps represented nicely
    // Sort array by step order
    updatedMelody.sort((a, b) => a.step - b.step);

    onChangeTrack({
      ...track,
      melody: updatedMelody
    });
  };

  const clearMelody = () => {
    const clearedMelody = Array.from({ length: 16 }, (_, i) => ({ step: i, note: null }));
    onChangeTrack({
      ...track,
      melody: clearedMelody
    });
  };

  const randomizeMelody = () => {
    const randomMelody: MelodyStep[] = Array.from({ length: 16 }, (_, i) => {
      // 40% chance of rest/null, else choice of random scale note
      const hasNote = Math.random() > 0.45;
      const note = hasNote ? SCALE_NOTES[Math.floor(Math.random() * SCALE_NOTES.length)] : null;
      return { step: i, note };
    });
    onChangeTrack({
      ...track,
      melody: randomMelody
    });
  };

  const primaryColor = track.colors[0] || "#6366f1";

  return (
    <div className="w-full frosted-glass p-6 rounded-2xl space-y-4">
      {/* Sequencer Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
            Melody Grid Sequencer
          </h3>
          <p className="text-xs text-subtle">
            Click grid blocks to compose notes. Yellow line marks active streaming sweep.
          </p>
        </div>

        {/* Rapid control buttons */}
        <div className="flex gap-2">
          <button
            id="btn-randomize-melody"
            onClick={randomizeMelody}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 hover:border-white/20 transition leading-none select-none cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            Randomize
          </button>
          <button
            id="btn-clear-melody"
            onClick={clearMelody}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-300 hover:bg-red-500/20 transition leading-none select-none cursor-pointer"
          >
            <Trash className="w-3.5 h-3.5" />
            Reset Grid
          </button>
        </div>
      </div>

      {/* Grid Canvas Wrapper */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[500px] flex gap-2">
          {/* Notes column on the far left */}
          <div className="flex flex-col justify-between py-1 pb-4 h-[260px] text-right pr-1 w-10 select-none">
            {SCALE_NOTES.map((note) => (
              <span key={note} className="text-[10px] font-mono text-white/50 leading-none h-7 flex items-center justify-end font-medium">
                {note}
              </span>
            ))}
          </div>

          {/* Grid interactive channels */}
          <div className="flex-1 grid gap-1 h-[260px]" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const currentStepObj = track.melody.find((m) => m.step === stepIdx);
              const stepNote = currentStepObj ? currentStepObj.note : null;
              const isColActive = activeStep === stepIdx && globalAudioEngine.isPlaying() && globalAudioEngine.getPlayingTrackId() === track.id;

              return (
                <div
                  key={stepIdx}
                  className={`flex flex-col justify-between h-full rounded transition-all duration-150 ${isColActive ? "bg-yellow-400/10 border-x border-yellow-400/30" : ""}`}
                >
                  {SCALE_NOTES.map((note) => {
                    const isCellSelected = stepNote === note;
                    
                    return (
                      <button
                        key={note}
                        id={`cell-${stepIdx}-${note}`}
                        onClick={() => handleCellClick(note, stepIdx)}
                        className={`h-7 w-full rounded focus:outline-none transition border cursor-pointer ${
                          isCellSelected
                            ? "border-none text-black font-semibold shadow-md active:scale-95"
                            : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                        style={{
                          backgroundColor: isCellSelected ? primaryColor : undefined,
                          boxShadow: isCellSelected ? `0 0 10px ${primaryColor}cc` : undefined,
                          borderColor: isCellSelected ? "transparent" : "rgba(255,255,255,0.04)"
                        }}
                      />
                    );
                  })}
                  {/* Step number labels at the very bottom */}
                  <span className={`text-[9px] font-mono text-center mt-1 select-none leading-none pt-1 ${isColActive ? "text-yellow-400 font-bold" : "text-white/30"}`}>
                    {stepIdx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Footer - active properties */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between text-xs bg-black/25 p-3 rounded-xl border border-white/[0.03]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-white/50">
            Tempo: <strong className="text-white font-mono">{track.bpm} BPM</strong>
          </span>
          <span className="text-white/50">
            Scale: <strong className="text-white">C Major / A Minor</strong>
          </span>
          <span className="text-white/50">
            Sequence Chords:{" "}
            <span className="flex gap-1 inline-flex ml-1">
              {track.chords.map((chord, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/5 text-white/80 font-mono"
                >
                  {chord}
                </span>
              ))}
            </span>
          </span>
        </div>
        
        <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/20 border border-emerald-500/10 px-2 py-0.5 rounded-full">
          Auto-saves Locally
        </span>
      </div>
    </div>
  );
}
