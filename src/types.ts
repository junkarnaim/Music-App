// Music player shared types

export interface SynthConfig {
  oscillatorType: "sine" | "triangle" | "sawtooth" | "square";
  cutoff: number;
  resonance: number;
  attack: number;
  release: number;
}

export interface MelodyStep {
  note: string | null;
  step: number;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  bpm: number;
  mood: string;
  lyrics: string;
  colors: string[]; // hex matching the song theme for ambient glow
  chords: string[]; // exactly 4 chord symbols, e.g. ["Am", "F", "C", "G"]
  melody: MelodyStep[]; // exactly 16 steps
  bassline: string[]; // exactly 4 bass notes matching the chord changes
  synthConfig: SynthConfig;
  isAIComposed?: boolean;
  // Spotify online streaming fields
  isSpotify?: boolean;
  artist?: string;
  previewUrl?: string | null;
  albumImg?: string;
  externalUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
}
