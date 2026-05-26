import { useEffect, useRef, useState } from "react";
import { globalAudioEngine } from "../audioEngine";
import { BarChart, Activity, HelpCircle, Sparkles } from "lucide-react";

interface AudioVisualizerProps {
  themeColors?: string[];
}

type VisualMode = "bars" | "wave" | "radial";

export default function AudioVisualizer({ themeColors = ["#6366f1", "#ec4899", "#000000"] }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualMode>("bars");
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas high resolution for crisp visual retina display
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const bufferLength = globalAudioEngine.analyser ? globalAudioEngine.analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const primaryColor = themeColors[0] || "#6366f1";
    const secondaryColor = themeColors[1] || "#ec4899";

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      
      // Dynamic background clearing with subtle motion blur trail
      ctx.fillStyle = "rgba(10, 10, 18, 0.2)";
      ctx.fillRect(0, 0, width, height);

      const analyser = globalAudioEngine.analyser;
      const isPlaying = globalAudioEngine.isPlaying();

      if (!analyser || !isPlaying) {
        // Draw elegant standby resting wave if nothing is playing
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = primaryColor;

        if (mode === "radial") {
          ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          for (let i = 0; i < width; i++) {
            const y = height / 2 + Math.sin(i * 0.02 + Date.now() * 0.003) * 6;
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        return;
      }

      // Fetch active synthesizer audio data
      if (mode === "wave") {
        analyser.getByteTimeDomainData(dataArray);
      } else {
        analyser.getByteFrequencyData(dataArray);
      }

      ctx.shadowBlur = 12;
      ctx.shadowColor = primaryColor;

      if (mode === "bars") {
        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          barHeight = (val / 255) * height * 0.78;

          // Double color gradients matching custom track energy
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, "rgba(20, 20, 30, 0.8)");
          grad.addColorStop(0.5, secondaryColor);
          grad.addColorStop(1, primaryColor);

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1.5, barHeight);

          x += barWidth;
        }
      } else if (mode === "wave") {
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === "radial") {
        const centerX = width / 2;
        const centerY = height / 2;
        let totalEnergy = 0;

        // Draw radial equalizer ring rays
        for (let i = 0; i < bufferLength; i++) {
          totalEnergy += dataArray[i];
          const val = dataArray[i];
          const angle = (i / bufferLength) * Math.PI * 2;
          const minRadius = Math.min(width, height) * 0.18;
          const maxRadius = minRadius + (val / 255) * 80;

          const startX = centerX + Math.cos(angle) * minRadius;
          const startY = centerY + Math.sin(angle) * minRadius;
          const endX = centerX + Math.cos(angle) * maxRadius;
          const endY = centerY + Math.sin(angle) * maxRadius;

          const grad = ctx.createLinearGradient(startX, startY, endX, endY);
          grad.addColorStop(0, primaryColor);
          grad.addColorStop(1, secondaryColor);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Animated inner bloom orb pulsing on absolute energy
        const avgEnergy = totalEnergy / bufferLength;
        const pulse = 32 + (avgEnergy / 255) * 45;
        
        ctx.fillStyle = secondaryColor;
        ctx.shadowColor = secondaryColor;
        ctx.shadowBlur = pulse * 0.6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, themeColors]);

  return (
    <div className="relative w-full h-full min-h-[220px] bg-[#06060c]/80 rounded-2xl overflow-hidden border border-white/10 shadow-inner flex flex-col justify-between">
      {/* Visualizer output canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" id="canvas-music-visualizer" />

      {/* Floating backdrop blur light */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[90px] opacity-25 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: themeColors[0] || "#6366f1" }}
      />

      {/* Floating Controls Overlay */}
      <div className="relative w-full flex justify-between items-center p-4 z-10 select-none">
        <span className="text-xs font-mono font-medium tracking-wide uppercase text-white/50 backdrop-blur-md px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
          Dynamic Audio Pipeline
        </span>
        
        <div className="flex bg-white/5 backdrop-blur-md p-0.5 rounded-lg border border-white/10">
          <button
            id="vismode-bars"
            onClick={() => setMode("bars")}
            className={`p-1.5 rounded transition ${mode === "bars" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
            title="Spectrum Analyzer"
          >
            <BarChart className="w-4 h-4" />
          </button>
          <button
            id="vismode-wave"
            onClick={() => setMode("wave")}
            className={`p-1.5 rounded transition ${mode === "wave" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
            title="Oscilloscope Waveform"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            id="vismode-radial"
            onClick={() => setMode("radial")}
            className={`p-1.5 rounded transition ${mode === "radial" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
            title="Cosmic Bloom Sphere"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic bottom subtitle */}
      <div className="relative p-4 z-10">
        <span className="text-[10px] font-mono tracking-widest uppercase text-white/30">
          procedurally synthesized frequency waves
        </span>
      </div>
    </div>
  );
}
