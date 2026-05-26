import { Track } from "./types";

// Convert Note Name (e.g. "C4", "A#3", "Gb5") to Frequency in Hz
export function noteToFreq(noteStr: string | null): number {
  if (!noteStr) return 0;
  
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const regex = /^([A-G]#?|b?)(-?\d+)$/;
  
  // Normalize flats to sharps
  let norm = noteStr.trim();
  if (norm.startsWith("Db")) norm = "C#" + norm.slice(2);
  if (norm.startsWith("Eb")) norm = "D#" + norm.slice(2);
  if (norm.startsWith("Gb")) norm = "F#" + norm.slice(2);
  if (norm.startsWith("Ab")) norm = "G#" + norm.slice(2);
  if (norm.startsWith("Bb")) norm = "A#" + norm.slice(2);

  const match = norm.match(regex);
  if (!match) return 0;

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  
  const noteIndex = notes.indexOf(noteName);
  if (noteIndex === -1) return 0;

  // C4 is semi-tone 0 relative to middle C
  // A4 is semi-tone 9 relative to middle C, octave = 4. Freq(A4) = 440 Hz
  // Formula: freq = 440 * 2^((midi - 69)/12)
  const midi = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Map chord symbol (e.g. "Am", "F", "G", "C") to component chord note strings
export function chordToNotes(chordName: string): string[] {
  const root = chordName.replace(/m|maj7|7|min|dim|\d/g, "").trim();
  const oct = 3; // base octave for chord pads
  
  // Core chord maps
  const isMinor = chordName.includes("m") && !chordName.includes("major") && !chordName.includes("maj7");
  const isSeventh = chordName.includes("7");
  
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rootIdx = notes.indexOf(root);
  if (rootIdx === -1) return [`A${oct}`, `C${oct + 1}`, `E${oct + 1}`]; // Default Am

  const getNoteName = (idx: number, octaveOffset = 0) => {
    const wrappedIdx = (rootIdx + idx) % 12;
    const addOct = Math.floor((rootIdx + idx) / 12) + oct + octaveOffset;
    return `${notes[wrappedIdx]}${addOct}`;
  };

  // Build basic triad
  const thirdSemi = isMinor ? 3 : 4;
  const fifthSemi = 7;
  const chordNotes = [
    getNoteName(0, 0),       // Root
    getNoteName(thirdSemi, 0), // Third
    getNoteName(fifthSemi, 0), // Fifth
  ];

  if (isSeventh) {
    const seventhSemi = isMinor ? 10 : 11;
    chordNotes.push(getNoteName(seventhSemi, 0));
  } else {
    // Add an octave double for thickness
    chordNotes.push(getNoteName(0, 1));
  }

  return chordNotes;
}

export class SynthAudioEngine {
  public audioCtx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  public masterGain: GainNode | null = null;
  public delayNode: DelayNode | null = null;
  public feedbackNode: GainNode | null = null;

  private isRunning: boolean = false;
  private currentTrack: Track | null = null;
  private bpm: number = 90;
  private volume: number = 0.5;

  private audioNode: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;

  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private scheduleInterval: any = null;
  private lookaheadMs: number = 30; // how far ahead to schedule
  private scheduleAheadTimeSec: number = 0.08; // overlapping window size for lookahead
  
  // Audio state hooks connected to React State
  private onStepCallback: ((step: number) => void) | null = null;
  private onStateChangeCallback: ((playing: boolean) => void) | null = null;

  constructor() {
    // Audio elements will be initiated lazily upon clicking play due to Browser Autoplay policy
  }

  private initAudio() {
    if (this.audioCtx) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create master nodes
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

    // Create delay/echo effect for lush synth feel
    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.35, this.audioCtx.currentTime);

    this.feedbackNode = this.audioCtx.createGain();
    this.feedbackNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    // Route: Synths -> Delay -> MasterGain -> Analyser -> Output
    // Also dry path bypasses Delay to keep dry signals clear
    // Synths -> MastGain
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode); // feedback loop
    
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  public setCallbacks(
    onStep: (step: number) => void,
    onStateChange: (playing: boolean) => void
  ) {
    this.onStepCallback = onStep;
    this.onStateChangeCallback = onStateChange;
  }

  public setVolume(val: number) {
    this.volume = val * 0.15; // Scaled down to prevent clipping from layered synths
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume / 0.15;
  }

  public start(track: Track) {
    this.initAudio();
    if (this.audioCtx?.state === "suspended") {
      this.audioCtx.resume();
    }

    // Stop any existing playback first
    const wasRunning = this.isRunning;
    if (wasRunning) {
      this.stop();
    }

    this.currentTrack = track;
    this.bpm = track.bpm || 90;

    this.isRunning = true;
    this.currentStep = 0;

    if (track.isSpotify) {
      // Stream Spotify Preview Track
      if (track.previewUrl && this.audioCtx && this.masterGain) {
        if (!this.audioNode) {
          this.audioNode = new Audio();
          this.audioNode.crossOrigin = "anonymous";
          this.audioSourceNode = this.audioCtx.createMediaElementSource(this.audioNode);
          this.audioSourceNode.connect(this.masterGain);
        }

        this.audioNode.src = track.previewUrl;
        this.audioNode.play().catch((e) => {
          console.error("Spotify playing state trigger failed:", e);
        });

        this.audioNode.onended = () => {
          this.stop();
        };
      }

      // Start simple sequence timer to trigger progress bar steps for the UI
      this.nextStepTime = this.audioCtx!.currentTime;
      this.scheduleInterval = setInterval(() => {
        if (this.audioNode && this.audioNode.paused) return;
        this.currentStep = (this.currentStep + 1) % 16;
        if (this.onStepCallback) {
          this.onStepCallback(this.currentStep);
        }
      }, (30 / this.bpm) * 1000);

    } else {
      // Procedural synthesizer sequencing
      const beatDuration = 60 / track.bpm;
      if (this.delayNode && this.audioCtx) {
        this.delayNode.delayTime.setValueAtTime(beatDuration * 0.75, this.audioCtx.currentTime);
      }

      this.nextStepTime = this.audioCtx!.currentTime;

      this.scheduleInterval = setInterval(() => {
        this.scheduler();
      }, this.lookaheadMs);
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(true);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }

    // Pause and reset Spotify Audio element if active
    if (this.audioNode) {
      this.audioNode.pause();
      this.audioNode.currentTime = 0;
      this.audioNode.onended = null;
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(false);
    }
  }

  public togglePlay(track: Track) {
    if (this.isRunning && this.currentTrack?.id === track.id) {
      this.stop();
    } else {
      this.start(track);
    }
  }

  public isPlaying(): boolean {
    return this.isRunning;
  }

  public getPlayingTrackId(): string | null {
    return this.isRunning && this.currentTrack ? this.currentTrack.id : null;
  }

  private scheduler() {
    if (!this.audioCtx || !this.currentTrack) return;

    // Schedule steps as long as they are within the schedule window
    while (this.nextStepTime < this.audioCtx.currentTime + this.scheduleAheadTimeSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const stepDuration = 30 / this.bpm; // Duration of an 8th note in seconds (half of beat)
    this.nextStepTime += stepDuration;
    
    this.currentStep = (this.currentStep + 1) % 16;
    if (this.onStepCallback) {
      // Schedule callback to update UI
      setTimeout(() => {
        if (this.isRunning && this.onStepCallback) {
          this.onStepCallback(this.currentStep);
        }
      }, Math.max(0, (this.nextStepTime - this.audioCtx!.currentTime) * 1000));
    }
  }

  private scheduleStep(step: number, time: number) {
    if (!this.audioCtx || !this.currentTrack || !this.masterGain) return;

    const config = this.currentTrack.synthConfig;
    const chords = this.currentTrack.chords;
    const bassline = this.currentTrack.bassline;

    // 1. MELODY STEP
    // The melody matches our 16-step grid
    const melObj = this.currentTrack.melody.find(m => m.step === step);
    if (melObj && melObj.note) {
      this.playSynthNote(melObj.note, time, 0.4, config);
    }

    // 2. CHORD HARMONY (Lush Pad Synth)
    // Every 4 steps represents a measure beat (chords change every 4 steps)
    if (step % 4 === 0) {
      const chordIndex = Math.floor(step / 4) % chords.length;
      const currentChordName = chords[chordIndex];
      const notes = chordToNotes(currentChordName);
      
      this.playChordPad(notes, time, 1.8, config);
    }

    // 3. LOW DEEP BASSLINE
    // Follow the chords every 4 beats, triggering a sustained deep root note
    if (step % 4 === 0) {
      const chordIndex = Math.floor(step / 4) % bassline.length;
      const bassNote = bassline[chordIndex];
      this.playBassNote(bassNote, time, 1.8);
    }

    // 4. SYNTHESIZED DRUMS (LO-FI / RETRO ACCENT)
    // Let's procedurally synthesize standard dynamic beats
    // Step 0, 8: Kick Drum
    if (step === 0 || step === 8) {
      this.playKickDrum(time);
    }
    // Step 4, 12: Snare / Clap sound
    if (step === 4 || step === 12) {
      this.playSnareClap(time);
    }
    // Odd steps: Cozy closed hi-hat ticking
    if (step % 2 !== 0) {
      this.playHiHat(time);
    }
  }

  // Synth Lead note synthesizer
  private playSynthNote(
    note: string, 
    time: number, 
    duration: number, 
    config: any
  ) {
    if (!this.audioCtx || !this.masterGain) return;

    const freq = noteToFreq(note);
    if (!freq) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = config.oscillatorType || "triangle";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(config.cutoff || 1200, time);
    filter.Q.setValueAtTime(config.resonance || 3, time);

    // ADSR active trigger envelope
    const gain = gainNode.gain;
    const attack = config.attack || 0.05;
    const release = config.release || 0.4;
    const maxGain = 0.12;

    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(maxGain, time + attack);
    gain.exponentialRampToValueAtTime(0.01, time + duration);
    gain.setValueAtTime(0.01, time + duration);
    gain.exponentialRampToValueAtTime(0.0001, time + duration + release);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Also send a portion to the delay unit for stereo ambient echo
    if (this.delayNode) {
      const effectSend = this.audioCtx.createGain();
      effectSend.gain.setValueAtTime(0.25, time);
      gainNode.connect(effectSend);
      effectSend.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(time + duration + release + 0.1);
  }

  // Soft Pad Chord Progression Orchestrator
  private playChordPad(
    notes: string[], 
    time: number, 
    duration: number, 
    config: any
  ) {
    if (!this.audioCtx || !this.masterGain) return;

    const padVolume = 0.04 / notes.length; // Soft layered pad

    notes.forEach(note => {
      const freq = noteToFreq(note);
      if (!freq) return;

      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      // Pads are always smooth warme wave shapes (sine/triangle)
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "lowpass";
      // Slow sweeps
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(900, time + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(400, time + duration);
      filter.Q.setValueAtTime(1.5, time);

      // Soft Pad ADSR Envelope (Extended attack & release)
      const gain = gainNode.gain;
      const attackSec = 0.4;
      const releaseSec = 0.8;

      gain.setValueAtTime(0, time);
      gain.linearRampToValueAtTime(padVolume, time + attackSec);
      gain.setValueAtTime(padVolume, time + duration - releaseSec);
      gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      // High effect sends for lush feeling
      if (this.delayNode) {
        const effectSend = this.audioCtx.createGain();
        effectSend.gain.setValueAtTime(0.4, time);
        gainNode.connect(effectSend);
        effectSend.connect(this.delayNode);
      }

      osc.start(time);
      osc.stop(time + duration + 0.1);
    });
  }

  // Deep Bass Synth
  private playBassNote(note: string, time: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const freq = noteToFreq(note);
    if (!freq) return;

    const osc = this.audioCtx.createOscillator();
    const subOsc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    // Sawtooth lead base with warm filter cut for a premium punchy hum
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    // sub oscillator sine wave 1 octave below
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(freq / 2, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(180, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + duration);
    filter.Q.setValueAtTime(2, time);

    const gain = gainNode.gain;
    const bassVolume = 0.18; // strong sub foundation

    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(bassVolume, time + 0.08); // slow punch
    gain.setValueAtTime(bassVolume, time + duration - 0.2);
    gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + duration + 0.1);
    subOsc.stop(time + duration + 0.1);
  }

  // Procedural Synth Kick Drum (Frequency Sweep)
  private playKickDrum(time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc.type = "sine";
    // Sweeps down from punchy high to deep sub rumble!
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

    const gain = gainNode.gain;
    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(0.25, time + 0.005);
    gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Procedural Synth Snare Claps (White Noise Burst + Filter)
  private playSnareClap(time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Build white noise buffer
    const bufferSize = this.audioCtx.sampleRate * 0.2; // 200ms white noise
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);
    filter.Q.setValueAtTime(2.0, time);

    const gainNode = this.audioCtx.createGain();
    const gain = gainNode.gain;
    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.exponentialRampToValueAtTime(0.0001, time + 0.18);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Snare send to Echo Delay for rich stereo clap length
    if (this.delayNode) {
      const snareDelay = this.audioCtx.createGain();
      snareDelay.gain.setValueAtTime(0.18, time);
      gainNode.connect(snareDelay);
      snareDelay.connect(this.delayNode);
    }

    noise.start(time);
    noise.stop(time + 0.2);
  }

  // Procedural High-Hat Shaker Click
  private playHiHat(time: number) {
    if (!this.audioCtx || !this.masterGain) return;

    // Small high-pitch random white noise burst
    const bufferSize = this.audioCtx.sampleRate * 0.04; // ultra short 40ms burst
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gainNode = this.audioCtx.createGain();
    const gain = gainNode.gain;
    gain.setValueAtTime(0, time);
    gain.linearRampToValueAtTime(0.035, time + 0.002);
    gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  // Play custom trigger from virtual synth layout keyboard
  public triggerVirtualKey(note: string, duration = 0.5) {
    this.initAudio();
    if (this.audioCtx?.state === "suspended") {
      this.audioCtx.resume();
    }
    
    // Quick lead triangle trigger
    const time = this.audioCtx!.currentTime;
    const config = this.currentTrack?.synthConfig || {
      oscillatorType: "triangle",
      cutoff: 1500,
      resonance: 3,
      attack: 0.02,
      release: 0.5
    };
    this.playSynthNote(note, time, duration, config);
  }
}

export const globalAudioEngine = new SynthAudioEngine();
