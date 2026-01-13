
import React, { useState, useRef, useEffect } from 'react';
import { AgentStatus } from '../types';

interface DigitalAvatarProps {
  status: AgentStatus;
  volume?: number; // Valor de 0 a 1 representando la intensidad del audio
}

const DigitalAvatar: React.FC<DigitalAvatarProps> = ({ status, volume = 0 }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [smoothedVolume, setSmoothedVolume] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const requestRef = useRef<number>(null);
  
  const isSpeaking = status === AgentStatus.SPEAKING;
  const isListening = status === AgentStatus.LISTENING;
  const isConnecting = status === AgentStatus.CONNECTING;
  const isIdle = status === AgentStatus.IDLE;
  const isError = status === AgentStatus.ERROR;

  // Lógica de suavizado (Damping/Lerp) para el volumen visual
  useEffect(() => {
    const animate = () => {
      setSmoothedVolume(prev => {
        const lerpFactor = 0.12; 
        const target = isSpeaking ? volume : 0;
        return prev + (target - prev) * lerpFactor;
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [volume, isSpeaking]);

  const avatarUrl = "https://zjyhmbwdapfvkpfqdvwh.supabase.co/storage/v1/object/sign/archivos/b657c78a18dd107c75c9b3138ae94e31.gif?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jZjUzZDI0ZS03OGVkLTQ0MDctYjY5MC03OGEzM2FlYzM4OGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcmNoaXZvcy9iNjU3Yzc4YTE4ZGQxMDdjNzVjOWIzMTM4YWU5NGUzMS5naWYiLCJpYXQiOjE3NjgxNDQ1NTUsImV4cCI6MTkyNTgyNDU1NX0.k1znJwiB_Ifjb4ikll-_nRegGYVaJUHMp5yL0QAbtDM";

  const handleCaptureFrame = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (canvas && img && img.naturalWidth > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        setImageLoaded(true);
      }
    }
  };

  return (
    <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] flex items-center justify-center avatar-jarvis-vars">
      
      {/* Background Glow - Reactive to Volume */}
      <div 
        className={`absolute rounded-full transition-all duration-700 ease-out blur-[80px] opacity-40 ${
          isSpeaking ? 'bg-blue-500' : isListening ? 'bg-amber-400' : isConnecting ? 'bg-white' : 'bg-blue-900/10'
        }`}
        style={{
          width: '70%',
          height: '70%',
          transform: `scale(${1 + smoothedVolume * 0.5})`,
        }}
      />

      {/* Outer Rotating HUD Rings (Jarvis Style) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Ring 1 - Fast Dash Ring */}
        <div className={`absolute w-[100%] h-[100%] border-[1px] border-dashed border-blue-400/20 rounded-full animate-jarvis-spin-slow transition-opacity duration-1000 ${isIdle ? 'opacity-20' : 'opacity-40'}`} />
        
        {/* Ring 2 - Triple Sector Ring */}
        <div className={`absolute w-[92%] h-[92%] transition-all duration-500 ${isSpeaking ? 'animate-jarvis-spin-fast' : 'animate-jarvis-spin-reverse'}`}
             style={{ opacity: isIdle ? 0.15 : 0.3 }}>
           <svg viewBox="0 0 100 100" className="w-full h-full stroke-blue-400 fill-none stroke-[0.5]">
             <circle cx="50" cy="50" r="48" strokeDasharray="60 40 20 80" />
           </svg>
        </div>

        {/* Ring 3 - Reactive Waveform Ring */}
        <div className="absolute w-[85%] h-[85%] flex items-center justify-center">
          <div className={`absolute inset-0 border-2 border-blue-500/10 rounded-full ${isSpeaking ? 'scale-110 opacity-0 transition-all duration-300' : 'scale-100 opacity-100'}`} 
               style={{ transform: `scale(${1 + smoothedVolume * 0.4})`, opacity: isIdle ? 0.2 : 0.6 }} />
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-blue-400 fill-none stroke-[1] opacity-40">
            <circle cx="50" cy="50" r="42" strokeDasharray="2 4" />
          </svg>
        </div>

        {/* Ring 4 - Rotating Hexagon Pattern Background */}
        <div className="absolute w-[75%] h-[75%] opacity-20 animate-jarvis-spin-slow-reverse">
           <div className="w-full h-full rounded-full border border-blue-400/20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-center opacity-30" />
        </div>
      </div>

      {/* Central Identity Frame */}
      <div className={`relative w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] md:w-[350px] md:h-[350px] rounded-full z-20 transition-all duration-700 overflow-hidden ${
        isSpeaking ? 'scale-[1.02]' : 'scale-100'
      }`}>
        
        {/* The Frame Border (Jarvis Style Glow) */}
        <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-500 z-50 ${
          isSpeaking ? 'border-blue-400' : isListening ? 'border-amber-400' : 'border-white/20'
        }`} style={{
          boxShadow: isSpeaking ? `inset 0 0 30px rgba(59,130,246,0.5), 0 0 20px rgba(59,130,246,0.3)` : 'none'
        }} />

        {/* Inner Scanline Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none z-40" />

        {/* Mayor Image Content - NO OPACITY REDUCTION, NO GRAYSCALE */}
        <div className={`w-full h-full relative transition-all duration-1000 ${isIdle ? 'animate-avatar-breath grayscale-0 opacity-100' : 'grayscale-0 opacity-100'}`}>
          <canvas 
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover z-30 transition-opacity duration-700 ${
              (!isSpeaking || smoothedVolume < 0.01) && imageLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${isConnecting ? 'blur-2xl opacity-20 scale-125' : ''}`}
          />

          <img 
            ref={imgRef}
            src={avatarUrl} 
            crossOrigin="anonymous"
            alt="Manuel Jurado - Alcalde" 
            onLoad={handleCaptureFrame}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-all duration-500 z-20 ${
              isConnecting ? 'blur-2xl opacity-20 scale-125' : 
              (isSpeaking && smoothedVolume >= 0.01) ? 'opacity-100 scale-110 contrast-125' : 'opacity-0 scale-100'
            }`}
          />
        </div>

        {/* Digital HUD Elements Inside the Frame */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {/* Scanning Line */}
          <div className={`absolute w-full h-[1px] bg-blue-400/30 animate-scan shadow-[0_0_10px_#60a5fa] ${isIdle ? 'opacity-20' : 'opacity-100'}`} />
          
          {/* Target Reticles */}
          <div className={`absolute top-4 left-4 w-4 h-4 border-t border-l border-blue-400/50 transition-opacity ${isIdle ? 'opacity-30' : 'opacity-100'}`} />
          <div className={`absolute top-4 right-4 w-4 h-4 border-t border-r border-blue-400/50 transition-opacity ${isIdle ? 'opacity-30' : 'opacity-100'}`} />
          <div className={`absolute bottom-4 left-4 w-4 h-4 border-b border-l border-blue-400/50 transition-opacity ${isIdle ? 'opacity-30' : 'opacity-100'}`} />
          <div className={`absolute bottom-4 right-4 w-4 h-4 border-b border-r border-blue-400/50 transition-opacity ${isIdle ? 'opacity-30' : 'opacity-100'}`} />
          
          {/* Volume Meter (Right) */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-end opacity-40">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={`h-1 transition-all duration-200 ${i < (smoothedVolume * 15) ? 'w-4 bg-blue-400' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="absolute top-full mt-4 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-widest text-blue-400 whitespace-nowrap">INITIATING_CORE</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Particles Around HUD */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-blue-400 rounded-full transition-all duration-1000 ${
              isSpeaking ? 'opacity-80' : 'opacity-0'
            }`}
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 30}deg) translateY(-220px) scale(${isSpeaking ? 1 : 0})`,
              boxShadow: '0 0 10px rgba(96,165,250,0.8)',
              animation: isSpeaking ? `jarvisParticle ${2 + Math.random() * 2}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes jarvis-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes jarvis-spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes jarvis-spin-fast {
          from { transform: rotate(0deg); }
          to { transform: rotate(720deg); }
        }
        @keyframes jarvis-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes avatar-breath {
          0%, 100% { transform: scale(1); filter: brightness(1.0); }
          50% { transform: scale(1.02); filter: brightness(1.1); }
        }
        @keyframes jarvisParticle {
          0%, 100% { transform: rotate(var(--rot)) translateY(-220px) scale(1); opacity: 0.2; }
          50% { transform: rotate(var(--rot)) translateY(-240px) scale(1.5); opacity: 0.8; }
        }
        .animate-jarvis-spin-slow { animation: jarvis-spin-slow 20s linear infinite; }
        .animate-jarvis-spin-slow-reverse { animation: jarvis-spin-slow-reverse 30s linear infinite; }
        .animate-jarvis-spin-fast { animation: jarvis-spin-fast 4s linear infinite; }
        .animate-jarvis-spin-reverse { animation: jarvis-spin-reverse 10s linear infinite; }
        .animate-scan { animation: scan 4s linear infinite; }
        .animate-avatar-breath { animation: avatar-breath 6s ease-in-out infinite; }
      `}} />
    </div>
  );
};

export default DigitalAvatar;
