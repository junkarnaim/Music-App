import { Track } from "./types";

export const PREDEFINED_TRACKS: Track[] = [
  {
    id: "midnight-lofi-chill",
    title: "Midnight Lofi Chill",
    description: "Relaxing lofi study beat featuring warm filter sweeps, dusty triangle keys, and gentle rhythmic pulses.",
    bpm: 72,
    mood: "Dreamy",
    colors: ["#6366f1", "#4f46e5", "#0f0c1b"],
    chords: ["Am7", "Dm7", "G7", "Cmaj7"],
    bassline: ["A2", "D2", "G2", "C2"],
    melody: [
      { step: 0, note: "E4" },
      { step: 2, note: "G4" },
      { step: 4, note: "A4" },
      { step: 6, note: "C5" },
      { step: 8, note: "B4" },
      { step: 10, note: "A4" },
      { step: 12, note: "G4" },
      { step: 14, note: "E4" }
    ],
    synthConfig: {
      oscillatorType: "triangle",
      cutoff: 800,
      resonance: 4,
      attack: 0.08,
      release: 0.6
    },
    lyrics: `[Verse 1]
Moonlight drips through window blinds
Neon shadows on my mind
Lines of code and cups of tea
Hours drift in galaxy

[Chorus]
Oh, standard time is fading low
Keep compiling nice and slow
Midnight lofi, study keys
Drifting on the solar breeze`
  },
  {
    id: "neon-horizon",
    title: "Neon Horizon",
    description: "Upbeat retro 80s synthwave track with driving basslines, bright sawtooth waves, and spaced-out stereo echoes.",
    bpm: 110,
    mood: "Retro",
    colors: ["#ec4899", "#d946ef", "#1e0424"],
    chords: ["Am", "F", "G", "Em"],
    bassline: ["A2", "F2", "G2", "E2"],
    melody: [
      { step: 0, note: "A4" },
      { step: 1, note: "B4" },
      { step: 2, note: "C5" },
      { step: 4, note: "E5" },
      { step: 6, note: "D5" },
      { step: 8, note: "C5" },
      { step: 10, note: "B4" },
      { step: 12, note: "A4" },
      { step: 14, note: "E4" }
    ],
    synthConfig: {
      oscillatorType: "sawtooth",
      cutoff: 1500,
      resonance: 2,
      attack: 0.02,
      release: 0.25
    },
    lyrics: `[Verse 1]
Tires burning, electric street
Out of time and out of sleep
Grid-lines guide us through the dark
Fueling the retro-future spark

[Chorus]
Over the neon, we will run
Brighter than the digital sun
Synthesizers start to cry
Speeding through the modern night`
  },
  {
    id: "cosmic-resonance",
    title: "Cosmic Resonance",
    description: "Deep galactic ambient pad with slow sweeping frequencies, starry sine bells, and vast expansive echoes.",
    bpm: 60,
    mood: "Spiritual",
    colors: ["#06b6d4", "#3b82f6", "#040e1a"],
    chords: ["C", "Am", "F", "G"],
    bassline: ["C2", "A2", "F2", "G2"],
    melody: [
      { step: 0, note: "G4" },
      { step: 4, note: "C5" },
      { step: 8, note: "E5" },
      { step: 12, note: "D5" }
    ],
    synthConfig: {
      oscillatorType: "sine",
      cutoff: 600,
      resonance: 1.5,
      attack: 0.25,
      release: 1.2
    },
    lyrics: `[Verse 1]
Silent vacuum, endless state
Empty orbits start to wait
Hydrogen begins to glow
A single frequency we details know

[Chorus]
Float away, cosmic resonance
Drifting in a starry trance
Frequencies without an end
In the sweep where planets bend`
  },
  {
    id: "retro-arcade-jump",
    title: "8-Bit Arcade Jump",
    description: "Hyperactive arcade chiptune theme with square wave arpeggios, crisp high-hat clicks, and bouncy retro-gaming melodies.",
    bpm: 125,
    mood: "Playful",
    colors: ["#10b981", "#84cc16", "#06130d"],
    chords: ["C", "G", "Am", "F"],
    bassline: ["C2", "G2", "A2", "F2"],
    melody: [
      { step: 0, note: "C5" },
      { step: 2, note: "E5" },
      { step: 4, note: "G5" },
      { step: 6, note: "C5" },
      { step: 8, note: "E5" },
      { step: 10, note: "G5" },
      { step: 12, note: "C6" },
      { step: 14, note: "B5" }
    ],
    synthConfig: {
      oscillatorType: "square",
      cutoff: 1800,
      resonance: 5,
      attack: 0.01,
      release: 0.15
    },
    lyrics: `[Verse 1]
Coins are falling, screen is bright
Chasing high scores into the night
Avoid the spikes and grab the key
Level up with nostalgic glee

[Chorus]
Jump! Jump! In the pixel maze
Back to the golden retro days
Eight-bit pulses start to play
Drive the boring real world away`
  }
];
