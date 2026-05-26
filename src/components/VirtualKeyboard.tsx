import { useState } from "react";
import { globalAudioEngine } from "../audioEngine";
import { Music } from "lucide-react";

interface KeyConfig {
  note: string;
  isBlack: boolean;
  label: string;
}

const PIANO_KEYS: KeyConfig[] = [
  { note: "C4", isBlack: false, label: "C" },
  { note: "C#4", isBlack: true, label: "C#" },
  { note: "D4", isBlack: false, label: "D" },
  { note: "D#4", isBlack: true, label: "D#" },
  { note: "E4", isBlack: false, label: "E" },
  { note: "F4", isBlack: false, label: "F" },
  { note: "F#4", isBlack: true, label: "F#" },
  { note: "G4", isBlack: false, label: "G" },
  { note: "G#4", isBlack: true, label: "G#" },
  { note: "A4", isBlack: false, label: "A" },
  { note: "A#4", isBlack: true, label: "A#" },
  { note: "B4", isBlack: false, label: "B" },
  { note: "C5", isBlack: false, label: "C" },
  { note: "C#5", isBlack: true, label: "C#" },
  { note: "D5", isBlack: false, label: "D" },
  { note: "D#5", isBlack: true, label: "D#" },
  { note: "E5", isBlack: false, label: "E" },
];

export default function VirtualKeyboard() {
  const [activeNotes, setActiveNotes] = useState<Record<string, boolean>>({});

  const playNote = (note: string) => {
    globalAudioEngine.triggerVirtualKey(note, 0.4);
    setActiveNotes((prev) => ({ ...prev, [note]: true }));
    // Clear trigger after small visual lift time
    setTimeout(() => {
      setActiveNotes((prev) => ({ ...prev, [note]: false }));
    }, 120);
  };

  return (
    <div className="w-full frosted-glass p-6 rounded-2xl space-y-4">
      {/* Keyboard details Header */}
      <div>
        <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          <Music className="w-4 h-4 text-pink-400" />
          Virtual Synth Keyboard
        </h3>
        <p className="text-xs text-subtle">
          Play manual riffs or jam live alongside the playing streaming track using our integrated synth.
        </p>
      </div>

      {/* Synthesizer Bed Layout */}
      <div className="relative flex justify-center py-4 bg-white/[0.01] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden select-none">
        <div className="relative flex h-36 w-full max-w-[560px] px-4">
          
          {/* White Keys Row */}
          <div className="flex w-full h-full justify-between gap-[2px]">
            {PIANO_KEYS.filter((k) => !k.isBlack).map((key) => {
              const isActive = activeNotes[key.note];
              return (
                <button
                  key={key.note}
                  id={`piano-white-${key.note}`}
                  onClick={() => playNote(key.note)}
                  className={`relative flex-1 rounded-b-md flex flex-col justify-end items-center pb-2 transition cursor-pointer ${
                    isActive 
                      ? "bg-slate-200 shadow-[inset_0_0_12px_rgba(139,92,246,0.8)] border border-indigo-500 scale-[0.98] origin-top" 
                      : "bg-white/95 hover:bg-white text-slate-900 border-t border-white/[0.2] shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold select-none text-slate-500">{key.label}</span>
                </button>
              );
            })}
          </div>

          {/* Black Keys overlapping absolute positioned Row */}
          {/* We position black key dividers precisely between whites */}
          {/* Calculated based on 10 white keys representing C4 to E5 */}
          <div className="absolute inset-x-0 top-0 h-24 px-4 pointer-events-none flex justify-between">
            {/* White keys count is 10. We lay helper gaps mapping to correct spacing ratio */}
            {/* Positions are relative to key spacing */}
          </div>
          
          {/* Let's simplify and make a pristine responsive absolute offset black keys layout */}
          {/* We place each black key at its exact offset manually so they rest centered over white key gaps */}
          <div className="absolute top-0 left-0 h-24 w-full h-full pointer-events-none px-4 flex justify-start">
            <div className="relative w-full h-full">
              {/* C#4 */}
              <button
                id="piano-black-C#4"
                onClick={() => playNote("C#4")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["C#4"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "6.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">C#</span>
              </button>

              {/* D#4 */}
              <button
                id="piano-black-D#4"
                onClick={() => playNote("D#4")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["D#4"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "16.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">D#</span>
              </button>

              {/* F#4 */}
              <button
                id="piano-black-F#4"
                onClick={() => playNote("F#4")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["F#4"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "36.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">F#</span>
              </button>

              {/* G#4 */}
              <button
                id="piano-black-G#4"
                onClick={() => playNote("G#4")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["G#4"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "46.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">G#</span>
              </button>

              {/* A#4 */}
              <button
                id="piano-black-A#4"
                onClick={() => playNote("A#4")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["A#4"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "56.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">A#</span>
              </button>

              {/* C#5 */}
              <button
                id="piano-black-C#5"
                onClick={() => playNote("C#5")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["C#5"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "76.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">C#</span>
              </button>

              {/* D#5 */}
              <button
                id="piano-black-D#5"
                onClick={() => playNote("D#5")}
                className={`absolute pointer-events-auto w-[6%] h-24 bg-[#07070f] rounded-b border-x border-b border-white/20 hover:bg-black transition flex flex-col justify-end items-center pb-2 ${activeNotes["D#5"] ? "bg-pink-500 shadow-lg scale-95" : ""}`}
                style={{ left: "86.5%" }}
              >
                <span className="text-[8px] font-mono text-white/50">D#</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
