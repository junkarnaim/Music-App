import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini API Client to prevent startup crash if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please check your Settings > Secrets in AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST route for composing procedural tracks with AI
app.post("/api/compose", async (req, res) => {
  try {
    const { prompt, genre } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const ai = getGenAI();

    const systemInstruction = 
      "You are an expert musical synthesist and composer specializing in procedural Web Audio API composition. " +
      "Your goal is to parse user prompts and return a completely original, structured song composition. " +
      "You must specify exact tempo BPM, chord scales, a 16-step melody grid with specific notes, " +
      "a bassline matching the progression, lyrics, description, and instrument synthesizer configuration " +
      "that will be procedurally synthesized in the browser. Always choose playable notes like C4, D4, E4, G4, A4, B4, C5 or similar.";

    const promptText = `Compose a completely original ${genre || "electronic"} track inspired by: "${prompt}".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "description", "bpm", "mood", "lyrics", "chords", "melody", "bassline", "synthConfig", "colors"],
          properties: {
            title: { type: Type.STRING, description: "A creative song title" },
            description: { type: Type.STRING, description: "Brief visual and musical description" },
            bpm: { type: Type.INTEGER, description: "Tempo in BPM (between 70 and 125)" },
            mood: { type: Type.STRING, description: "One word mood description (e.g. nostalgic, dreamy, energetic, synthwave)" },
            lyrics: { 
              type: Type.STRING, 
              description: "Full song lyrics formatted in stanzas (verse, chorus, etc.) separated by newlines" 
            },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 3 neon/hex theme color codes (e.g., ['#ff007f', '#00f0ff', '#120024']) fitting the vibe of the song"
            },
            chords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 chords for the progression (e.g., ['Am', 'F', 'C', 'G'] or ['Em', 'C', 'G', 'D'])"
            },
            melody: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["note", "step"],
                properties: {
                  note: { type: Type.STRING, description: "Note name like 'E4', 'G4', 'A4', 'C5', 'D5', or null for silence/rest" },
                  step: { type: Type.INTEGER, description: "The grid step number (0 to 15)" }
                }
              },
              description: "A melody sequence of exactly 16 steps (grid 0 to 15). Specify notes to construct a catchy, rhythmic melody hook."
            },
            bassline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 bass notes matching the chord progression (e.g., ['A2', 'F2', 'C2', 'G2'])"
            },
            synthConfig: {
              type: Type.OBJECT,
              required: ["oscillatorType", "cutoff", "resonance", "attack", "release"],
              properties: {
                oscillatorType: { type: Type.STRING, description: "Vibe matches 'sine', 'triangle', 'sawtooth', or 'square'" },
                cutoff: { type: Type.INTEGER, description: "Filter cutoff frequency index (e.g. 500 to 2000)" },
                resonance: { type: Type.INTEGER, description: "Filter Q factor (e.g. 1 to 8)" },
                attack: { type: Type.NUMBER, description: "Envelope attack duration in seconds (0.01 to 0.4)" },
                release: { type: Type.NUMBER, description: "Envelope release duration in seconds (0.1 to 1.5)" }
              }
            }
          }
        }
      }
    });

    const musicData = JSON.parse(response.text.trim());
    return res.json(musicData);
  } catch (error: any) {
    console.error("AI composition failed:", error);
    return res.status(500).json({ error: error.message || "Failed to compose track" });
  }
});

// Spotify Integration State Store and Helpers
let spotifyToken: { accessToken: string; expiresAt: number } | null = null;

async function getSpotifyToken(userClientId?: string, userClientSecret?: string): Promise<string | null> {
  const clientId = userClientId || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = userClientSecret || process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Use cached token only if using server-side config keys (not user-entered overriden keys)
  const isCustomUserKey = !!(userClientId || userClientSecret);
  if (!isCustomUserKey && spotifyToken && spotifyToken.expiresAt > Date.now()) {
    return spotifyToken.accessToken;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Spotify token exchange failed:", errText);
      return null;
    }

    const data: any = await response.json();
    const tokenVal = data.access_token;
    
    if (!isCustomUserKey) {
      spotifyToken = {
        accessToken: tokenVal,
        expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Expire 1 minute early
      };
    }
    return tokenVal;
  } catch (err) {
    console.error("Failed to authenticate to Spotify Client Credentials service:", err);
    return null;
  }
}

// Endpoint to query Spotify API Configuration Status
app.get("/api/spotify/config", async (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const isConfigured = !!(clientId && clientSecret);
  
  res.json({
    isConfigured,
    message: isConfigured 
      ? "Spotify API streaming connected successfully." 
      : "Spotify credentials not set. Running in catalog fallback sandbox."
  });
});

// Helper to generate sandbox mock tracks for offline or premium-restricted credentials gracefully
function getSandboxTracks(query: string) {
  const sandboxTracks = [
    {
      id: "spotify-sandbox-1",
      title: "Starlight Neon (Catalog Fallback)",
      artist: "Sunset Driver",
      album_img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=60",
      preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      external_url: "https://open.spotify.com",
      bpm: 100,
      mood: "Retro",
      description: "A cozy streaming synth track from our remote database index.",
      isSpotify: true
    },
    {
      id: "spotify-sandbox-2",
      title: "Lo-Fi Coffee Shop (Catalog Fallback)",
      artist: "Study Beats Collective",
      album_img: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=60",
      preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      external_url: "https://open.spotify.com",
      bpm: 80,
      mood: "Dreamy",
      description: "Mellow dusty crackle tracks for coding and relaxing.",
      isSpotify: true
    },
    {
      id: "spotify-sandbox-3",
      title: "Digital Rain Forest (Catalog Fallback)",
      artist: "The Biomes",
      album_img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60",
      preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      external_url: "https://open.spotify.com",
      bpm: 65,
      mood: "Peaceful",
      description: "Generative organic nature soundscapes and soft synth echoes.",
      isSpotify: true
    }
  ];

  if (!query) return sandboxTracks;
  const filtered = sandboxTracks.filter(
    (t) => 
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      t.artist.toLowerCase().includes(query.toLowerCase())
  );
  return filtered.length > 0 ? filtered : sandboxTracks;
}

// Endpoint to Search Spotify tracks or yield Sandbox tracks if secrets are unconfigured
app.get("/api/spotify/search", async (req, res) => {
  const query = (req.query.q as string) || "";
  const customClientId = req.query.clientId as string;
  const customClientSecret = req.query.clientSecret as string;

  if (!query.trim()) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  try {
    const token = await getSpotifyToken(customClientId, customClientSecret);
    if (!token) {
      console.log("Spotify unconfigured or token failed - returning Sandbox fallback tracks for queries");
      return res.json({ 
        isSandbox: true, 
        tracks: getSandboxTracks(query),
        warning: "Spotify API credentials invalid, unconfigured, or expired. Reverted to Catalog Sandbox fallback."
      });
    }

    // Call official Spotify API
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=12`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Spotify API error returned status ${response.status}:`, errText);
      
      let warningMessage = `Spotify API returned status ${response.status}. Reverted to Catalog Sandbox fallback.`;
      if (response.status === 403) {
        warningMessage = "Spotify developer restriction (403 Forbidden): Premium subscription ownership required. Reverted to Sandbox catalog.";
      } else if (response.status === 401) {
        warningMessage = "Spotify access unauthorized (401): Please verify developer client keys.";
      }
      
      return res.json({
        isSandbox: true,
        tracks: getSandboxTracks(query),
        warning: warningMessage
      });
    }

    const data: any = await response.json();
    const tracks = (data.tracks?.items || [])
      .filter((item: any) => item.preview_url !== null) // filter tracks that have instant streaming previews!
      .map((item: any) => ({
        id: `spotify-${item.id}`,
        title: item.name,
        artist: item.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
        album_img: item.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60",
        preview_url: item.preview_url,
        external_url: item.external_urls?.spotify,
        bpm: 100, // Custom approximate BPM for the sequencer grid playhead sync
        mood: "Online",
        description: `Spotify track from album '${item.album?.name || "Unknown"}'. Click play to stream 30s official high-quality preview.`,
        isSpotify: true
      }));

    // If all returned items lacked a preview, try again without the filter to give user at least some external linkable assets
    const finalTracks = tracks.length > 0 ? tracks : (data.tracks?.items || []).map((item: any) => ({
      id: `spotify-${item.id}`,
      title: item.name,
      artist: item.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
      album_img: item.album?.images?.[0]?.url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=60",
      preview_url: item.preview_url || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // fall back gracefully
      external_url: item.external_urls?.spotify,
      bpm: 90,
      mood: "Online Only",
      description: `Spotify track '${item.name}' by ${item.artists?.[0]?.name}.`,
      isSpotify: true
    }));

    return res.json({ isSandbox: false, tracks: finalTracks });
  } catch (error: any) {
    console.error("Spotify Search controller failed:", error);
    return res.json({
      isSandbox: true,
      tracks: getSandboxTracks(query),
      warning: `Internal Search exception: ${error.message || error}. Reverted to Catalog Sandbox.`
    });
  }
});

// Configure Vite or Static Asset Serving
async function bootServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server running on http://0.0.0.0:${PORT}`);
  });
}

bootServer().catch((err) => {
  console.error("Failed to start server:", err);
});
