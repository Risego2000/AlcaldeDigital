
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { SYSTEM_INSTRUCTION } from './constants';
import { AgentStatus } from './types';
import DigitalAvatar from './components/DigitalAvatar';
import { decodeBase64, decodeAudioData, createPcmBlob, downsampleBuffer } from './utils/audioUtils';

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
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
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
    try {
      if (!audioContextInRef.current || !sessionPromiseRef.current) return;

      const stream = micStreamRef.current || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      micStreamRef.current = stream;

      // Limpia cualquier source/processor anterior
      if (micSourceRef.current) { micSourceRef.current.disconnect(); }
      if (micProcessorRef.current) { micProcessorRef.current.disconnect(); }

      const source = audioContextInRef.current.createMediaStreamSource(stream);
      const scriptProcessor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);


      scriptProcessor.onaudioprocess = (e) => {
        // PERMITIR SIEMPRE el envío de audio para detectar interrupciones (Barge-in)
        // Solo filtramos si no estamos en vivo o si la sesión ha sido limpiada
        if (!isLive || !sessionPromiseRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Debug volumen (descomentar si se necesita)
        // let sum = 0;
        // for (let i = 0; i < inputData.length; i++) { sum += inputData[i] * inputData[i]; }
        // const rms = Math.sqrt(sum / inputData.length);
        // if (rms > 0.01) console.log("🎤 Audio in RMS:", rms.toFixed(4));

        const inputSampleRate = audioContextInRef.current.sampleRate;
        const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);
        const pcmData = createPcmBlob(downsampled);

        sessionPromiseRef.current.then(session => {
          // Verificar si el socket está abierto antes de enviar (evita error "WebSocket is closed")
          // Nota: La API de GenAI no expone el socket directamente, pero podemos atrapar el error.
          session.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } });
        }).catch(e => {
          // Si el error indica que el socket está cerrado, detenemos el procesamiento
          if (JSON.stringify(e).includes("CLOSED") || JSON.stringify(e).includes("CLOSING")) {
            console.warn("⚠️ WebSocket cerrado, deteniendo envío de audio.");
            // Opcional: llamar a handleStop() si es crítico, pero aquí solo evitamos el log
          } else {
            console.error("Error enviando audio:", e);
          }
        });
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextInRef.current.destination);

      micSourceRef.current = source;
      micProcessorRef.current = scriptProcessor;
    } catch (err) {
      console.error('Error al iniciar micrófono:', err);
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
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 }); // CHANGED: 48000Hz (standard) instead of 24000Hz

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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            languageCode: 'es-ES', // Español de España
          },
          systemInstruction: SYSTEM_INSTRUCTION + "\n\nIMPORTANTE: Tienes acceso a GOOGLE SEARCH. Utilízalo activamente para responder preguntas sobre la actualidad de Daganzo, el tráfico en Madrid, el tiempo o noticias de última hora que afecten a los ciudadanos.",
          tools: [{ googleSearch: {} }],
        },
        callbacks: {
          onopen: () => {
            setStatus(AgentStatus.SPEAKING);

            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: "CONEXIÓN ESTABLECIDA. Saluda al ciudadano como Manuel Jurado y ofrécele tu ayuda." });
            });
            // NOTA: El micrófono se iniciará después del saludo inicial
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
              console.log('🎵 Gemini enviando audio, chunks activos:', activeSourcesRef.current.size);
              setStatus(AgentStatus.SPEAKING);

              // Pausar/desconectar micrófono mientras habla para evitar eco
              // if (micSourceRef.current) { micSourceRef.current.disconnect(); }
              // if (micProcessorRef.current) { micProcessorRef.current.disconnect(); }

              const ctx = audioContextOutRef.current;

              // Log estado del AudioContext
              console.log(`🎛️ AudioContext state: ${ctx.state}, sampleRate: ${ctx.sampleRate}, currentTime: ${ctx.currentTime.toFixed(2)}s`);

              // CRÍTICO: Asegurar que el AudioContext está en estado 'running'
              if (ctx.state === 'suspended') {
                console.warn('⚠️ AudioContext suspended, resuming...');
                await ctx.resume();
                console.log('✅ AudioContext resumed, state:', ctx.state);
              }

              if (ctx.state !== 'running') {
                console.error('❌ AudioContext NOT running! State:', ctx.state);
              }

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 48000, 1); // CHANGED: 48000Hz to match AudioContext
              console.log(`🔊 Audio decodificado: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} canales`);

              // DEBUG: Test directo de reproducción con el primer chunk
              if (!(window as any).hasTestedAudio) {
                (window as any).hasTestedAudio = true;
                console.log('🧪 TEST: Intentando reproducir este chunk directamente...');
                const testSource = ctx.createBufferSource();
                testSource.buffer = audioBuffer;
                testSource.connect(ctx.destination);
                testSource.start(0); // Inmediato
                testSource.onended = () => console.log('🧪 TEST chunk terminado');
                console.log('🧪 TEST: Si escuchas algo AHORA, el pipeline funciona');
              }

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;

              // Conectar al analyser para visualización
              source.connect(analyserRef.current);

              // TEMPORAL DEBUG: Conectar TAMBIÉN directamente al destination
              // para bypass del analyser por si está causando problemas
              source.connect(ctx.destination);
              console.log('🔌 Source conectado a analyser Y destination (debug)');

              source.onended = () => {
                activeSourcesRef.current.delete(source);
                console.log('✅ Chunk terminado. Quedan:', activeSourcesRef.current.size);

                // Limpiar cualquier timer anterior
                if (listeningTimerRef.current) {
                  clearTimeout(listeningTimerRef.current);
                }

                // Si no quedan chunks, esperar 1.5s antes de cambiar a LISTENING
                if (activeSourcesRef.current.size === 0) {
                  listeningTimerRef.current = setTimeout(() => {
                    console.log('👂 Cambiando a LISTENING - listo para escuchar');
                    setStatus(AgentStatus.LISTENING);
                    startMicrophone(); // Activar micrófono
                  }, 1500);
                }
              };

              console.log(`▶️ Starting playback at ${nextStartTimeRef.current.toFixed(2)}s`);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              if (listeningTimerRef.current) {
                clearTimeout(listeningTimerRef.current);
                listeningTimerRef.current = null;
              }
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(AgentStatus.LISTENING);
              startMicrophone(); // Reactivar micrófono al interrumpir
            }
          },
          onerror: (e) => {
            console.error("Live session error:", e);
            setStatus(AgentStatus.ERROR);
          },
          onclose: () => handleStop()
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
          <div className="flex items-center gap-3 mb-2">
            <img src="EscudoBl.png" alt="Escudo Daganzo" className="h-10 md:h-14 opacity-90 drop-shadow-lg" />
          </div>
          <h1 className="text-2xl md:text-4xl font-light tracking-widest uppercase">
            Ayuntamiento de <span className="font-bold block md:inline text-blue-400">Daganzo de Arriba</span>
          </h1>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-[0.2em] uppercase opacity-70 leading-relaxed">
            Oficina virtual de atencion al ciudadano
          </p>
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
