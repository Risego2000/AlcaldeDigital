
import React from 'react';

const TelephonyPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 border border-blue-100 max-w-2xl w-full mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
          <i className="fa-solid fa-tower-cell text-xl"></i>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Despliegue Telefónico</h2>
          <p className="text-sm text-gray-500">Guía de integración para el Ayuntamiento de Daganzo</p>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">1. Requisitos de Infraestructura</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <li className="flex items-start gap-2 text-sm text-gray-600 bg-slate-50 p-3 rounded-lg">
              <i className="fa-solid fa-check-circle text-green-500 mt-1"></i>
              <span><strong>Número VoIP:</strong> Adquirir número en Twilio o Vonage (Prefijo 91).</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600 bg-slate-50 p-3 rounded-lg">
              <i className="fa-solid fa-check-circle text-green-500 mt-1"></i>
              <span><strong>Servidor Bridge:</strong> Node.js con Fastify o Express para gestionar WebSockets.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">2. Flujo de Datos (Media Streams)</h3>
          <div className="relative p-4 bg-indigo-950 rounded-xl font-mono text-[11px] text-indigo-200 overflow-x-auto">
            <div className="flex flex-col gap-2">
              <p className="text-indigo-400">// Ejemplo de flujo en el servidor backend</p>
              <p>1. <span className="text-white">Twilio</span> recibe llamada -> <span className="text-yellow-400">&lt;Stream url="wss://tu-servidor.com/v1" /&gt;</span></p>
              <p>2. <span className="text-white">Tu Servidor</span> abre WebSocket con <span className="text-blue-400">Gemini Live API</span></p>
              <p>3. <span className="text-white">Conversión:</span> Audio Mulaw (Twilio) ↔ Audio PCM (Gemini)</p>
              <p>4. <span className="text-white">Baja Latencia:</span> Gemini responde y el audio fluye directo al ciudadano.</p>
            </div>
          </div>
        </section>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4 items-center">
          <i className="fa-solid fa-circle-info text-blue-500 text-xl"></i>
          <p className="text-xs text-blue-800 leading-relaxed">
            La <strong>Gemini 2.5 Flash Native Audio</strong> es ideal para esto porque procesa audio de forma nativa, permitiendo una conversación fluida sin interrupciones y con una latencia inferior a 1 segundo, esencial para la atención telefónica.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TelephonyPanel;
