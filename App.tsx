
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './constants';
import { AgentStatus } from './types';
import DigitalAvatar from './components/DigitalAvatar';
import { decodeBase64, decodeAudioData, createPcmBlob, downsampleBuffer } from './utils/audioUtils';
import v1Knowledge from './json/BaseConocimiento_Daganzo_V1.json';
import v2Intentions from './json/BaseConocimiento_Daganzo_V2.json';
import v3Dialogues from './json/Motor_Dialogo_Daganzo_V3.json';

interface GroundingSource {
  title: string;
  uri: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [isLive, setIsLive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [sources, setSources] = useState<GroundingSource[]>([]);

  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const listeningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const statusRef = useRef<AgentStatus>(AgentStatus.IDLE);

  useEffect(() => {
    statusRef.current = status;
    const updateVolume = () => {
      if (analyserRef.current && (status === AgentStatus.SPEAKING || status === AgentStatus.LISTENING)) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setVolume(Math.min(rms * 5, 1));
      } else {
        setVolume(0);
      }
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    animationFrameRef.current = requestAnimationFrame(updateVolume);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status]);

  // Función para iniciar el micrófono y enviar audio a Gemini cuando el agente está LISTENING
  const startMicrophone = async () => {
    console.log('🎤 startMicrophone() called');
    try {
      const ctx = audioContextInRef.current;
      if (!ctx || !sessionPromiseRef.current) {
        console.error('❌ audioContextInRef or sessionPromiseRef is NULL');
        return;
      }

      // Asegurar que el contexto está activo
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = micStreamRef.current || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      micStreamRef.current = stream;

      if (micSourceRef.current) micSourceRef.current.disconnect();
      if (micProcessorRef.current) micProcessorRef.current.disconnect();

      const source = ctx.createMediaStreamSource(stream);

      // Creamos el nodo. Si falla por no estar registrado, reintentamos cargar el módulo
      let workletNode: AudioWorkletNode;
      const workletPath = `${import.meta.env.BASE_URL}audio-processor.js`;
      try {
        workletNode = new AudioWorkletNode(ctx, 'audio-pcm-processor');
      } catch (e) {
        console.log(`🔄 Reintentando cargar AudioWorklet desde ${workletPath}...`);
        await ctx.audioWorklet.addModule(workletPath);
        workletNode = new AudioWorkletNode(ctx, 'audio-pcm-processor');
      }

      workletNode.port.onmessage = (e) => {
        if (!sessionPromiseRef.current) return;
        const inputData = e.data;
        const downsampled = downsampleBuffer(inputData, ctx.sampleRate, 16000);
        const pcmData = createPcmBlob(downsampled);
        sessionPromiseRef.current.then(session => {
          session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } });
        }).catch(() => { });
      };

      source.connect(workletNode);
      workletNode.connect(ctx.destination);
      micSourceRef.current = source;
      micProcessorRef.current = workletNode;

      console.log('✅ Micrófono conectado con AudioWorklet');
    } catch (err) {
      console.error('❌ Error crítico al iniciar micrófono:', err);
    }
  };

  const startCall = async () => {
    try {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }

      if (!process.env.API_KEY) {
        alert("Error: No se encontró la API Key de Gemini. Verifica la configuración de secretos en GitHub.");
        return;
      }

      setSources([]);
      setStatus(AgentStatus.CONNECTING);
      setIsLive(true);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const ctxIn = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextInRef.current = ctxIn;

      // Intentar cargar el módulo inmediatamente al crear el contexto
      ctxIn.audioWorklet.addModule(`${import.meta.env.BASE_URL}audio-processor.js`).catch(e => console.error("Error precargando worklet:", e));

      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });

      analyserRef.current = audioContextOutRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioContextOutRef.current.destination);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, // Voz masculina profunda y madura
            languageCode: 'es-ES', // Español de España
          },
          systemInstruction: SYSTEM_INSTRUCTION + `

---
📚 BASE DE CONOCIMIENTO MUNICIPAL DE DAGANZO - DATOS REALES:

**V1 - NORMATIVA (${v1Knowledge.normativa?.length || 0} documentos):**
${v1Knowledge.normativa?.slice(0, 15).map(n => `- ${n.ID}: ${n.Nombre}`).join('\n') || 'No disponible'}
... USA los IDs de normativa para citar leyes específicas.

**TRÁMITES DISPONIBLES (${(v1Knowledge as any).tramites?.length || 0}):**
${((v1Knowledge as any).tramites || []).slice(0, 10).map((t: any) => `- ${t.ID}: ${t.Nombre}`).join('\n')}

**V2 - ${v2Intentions.intenciones?.length || 0} INTENCIONES clasificadas por sectores**
**V3 - ${v3Dialogues.flows?.length || 0} FLUJOS de diálogo operativos**

IMPORTANTE: Tienes acceso a GOOGLE SEARCH para actualidad. Úsalo para:
- Tiempo actual en Daganzo
- Tráfico en carreteras (M-100, etc)
- Eventos y noticias locales recientes
`,
          tools: [{ googleSearch: {} }],
          realtimeInputConfig: {
            automaticActivityDetection: {
              silenceDurationMs: 600,
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH' as any
            }
          }
        },
        callbacks: {
          onopen: () => {
            console.log('🌐 Sesión Live abierta');
            setStatus(AgentStatus.LISTENING);
            startMicrophone(); // INICIAR MICRÓFONO INMEDIATAMENTE para permitir interrupciones

            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: "CONEXIÓN ESTABLECIDA. Saluda al ciudadano como Manuel Jurado y ofrécele tu ayuda." });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const groundingMetadata = message.serverContent?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
              const newSources = groundingMetadata.groundingChunks
                .filter(chunk => chunk.web)
                .map(chunk => ({
                  title: chunk.web?.title || 'Fuente de información',
                  uri: chunk.web?.uri || '#'
                }));

              if (newSources.length > 0) {
                setSources(prev => {
                  const combined = [...prev, ...newSources];
                  const unique = combined.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
                  return unique.slice(-4);
                });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current && analyserRef.current) {
              const ctx = audioContextOutRef.current;
              setStatus(AgentStatus.SPEAKING);

              if (ctx.state === 'suspended') {
                await ctx.resume();
              }

              // Sincronizar tiempo si no hay nada sonando
              if (activeSourcesRef.current.size === 0) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.05);
              }

              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;

              source.connect(analyserRef.current);
              source.connect(ctx.destination);

              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) {
                  setStatus(AgentStatus.LISTENING);
                }
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              console.log('🔇 Interrupción detectada (Barge-in), deteniendo audio...');

              activeSourcesRef.current.forEach(s => {
                try { s.stop(); s.disconnect(); } catch (e) { }
              });
              activeSourcesRef.current.clear();

              if (audioContextOutRef.current) {
                nextStartTimeRef.current = audioContextOutRef.current.currentTime;
              }
              setStatus(AgentStatus.LISTENING);
            }
          },
          onerror: (e) => {
            console.error("❌ Live session error:", e);
            setStatus(AgentStatus.ERROR);
          },
          onclose: () => {
            console.warn('⚠️ Sesión Live cerrada. Analizando causa...');
            // Intentar detectar si fue un cierre inesperado
            if (statusRef.current !== AgentStatus.IDLE) {
              console.error('❌ El WebSocket se cerró inesperadamente mientras el agente no estaba en IDLE.');
            }
            handleStop();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start call:", err);
      alert(`Error al iniciar la llamada: ${err instanceof Error ? err.message : String(err)}`);
      setStatus(AgentStatus.ERROR);
      setIsLive(false);
    }
  };

  const handleStop = () => {
    // Limpiar timer de listening
    if (listeningTimerRef.current) {
      clearTimeout(listeningTimerRef.current);
      listeningTimerRef.current = null;
    }

    // Detener micrófono
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    setIsLive(false);
    setStatus(AgentStatus.IDLE);
    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    activeSourcesRef.current.clear();
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
    analyserRef.current = null;
    setVolume(0);
    setSources([]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#010409] text-white overflow-hidden font-sans relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" />
      </div>

      <main className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-between min-h-screen py-6 md:py-10 px-4 md:px-6">

        <header className="text-center space-y-4 animate-fadeIn w-full flex flex-col items-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <img
              src={`${import.meta.env.BASE_URL}Escudobn.png`}
              alt="Escudo Daganzo"
              className="h-16 md:h-20 w-auto object-contain brightness-110 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] mix-blend-lighten"
            />
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-light tracking-widest uppercase">
                Ayuntamiento de <span className="font-bold block md:inline text-blue-400">Daganzo de Arriba</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-[0.2em] uppercase opacity-70 leading-relaxed mt-1">
                Oficina virtual de atención al ciudadano
              </p>
            </div>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col items-center justify-center w-full my-6">
          <DigitalAvatar status={status} volume={volume} />

          {sources.length > 0 && isLive && (
            <div className="mt-8 animate-fadeInUp w-full max-w-md px-4">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2 relative z-10">
                  <i className="fa-solid fa-magnifying-glass-chart animate-pulse"></i> Información Verificada por Google
                </h3>
                <div className="flex flex-col gap-2 relative z-10">
                  {sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 transition-all group/item"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/item:bg-blue-500 group-hover/item:text-white transition-all">
                        <i className="fa-solid fa-link text-xs"></i>
                      </div>
                      <span className="text-[11px] md:text-xs text-slate-200 font-semibold truncate flex-1">{source.title}</span>
                      <i className="fa-solid fa-chevron-right text-[10px] text-slate-600 group-hover/item:translate-x-1 transition-transform"></i>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full flex flex-col items-center gap-8 md:gap-10">
          {!isLive ? (
            <div className="flex flex-col items-center gap-6 animate-fadeInUp w-full max-w-md px-4">
              <button
                onClick={startCall}
                className="group relative w-full px-8 py-5 bg-white text-black rounded-full font-black text-base md:text-lg uppercase tracking-tight hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] overflow-hidden whitespace-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-3">
                  <i className="fa-solid fa-phone-flip text-blue-600 group-hover:rotate-12 transition-transform"></i>
                  Hablar con Manuel Jurado
                </span>
              </button>
              <div className="text-center">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-slate-500 opacity-80">
                  EXCMO. ALCALDE DE DAGANZO DE ARRIBA (MADRID)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 animate-fadeInUp">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleStop}
                  className="w-16 h-16 md:w-20 md:h-20 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xl md:text-2xl transition-all hover:scale-110 active:scale-90 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                  title="Finalizar llamada"
                >
                  <i className="fa-solid fa-phone-slash rotate-[135deg]"></i>
                </button>
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span> Llamada en directo
                </p>
                {(status === AgentStatus.LISTENING || status === AgentStatus.SPEAKING) && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm animate-fadeIn">
                    <div className={`w-2 h-2 rounded-full ${status === AgentStatus.LISTENING ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse-dot`} />
                    <i className={`fa-solid ${status === AgentStatus.LISTENING ? 'fa-microphone' : 'fa-volume-high'} text-[10px] text-gray-400`}></i>
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                      {status === AgentStatus.LISTENING ? 'Escuchando' : 'Hablando'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-[9px] md:text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] flex items-center gap-4 pt-4 border-t border-white/5 w-full justify-center">
            <span>© 2026 Ayuntamiento de Daganzo</span>
            <span className="w-[1px] h-3 bg-slate-800" />
            <span>Desarrollado por N.I.P. 28053049</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
