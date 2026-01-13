// knowledge.ts - Sistema de gestión de conocimiento de 3 capas
// NO usa imports con "@/" - solo rutas relativas y fetch

interface V1Knowledge {
    meta: any;
    taxonomia: any[];
    fuentes: any[];
    tramites: any[];
    faqs: any[];
    reglas_bandos_calendarios: any[];
    glosario: any[];
}

interface V2Intents {
    meta: any;
    intenciones: Array<{
        ID: string;
        Sector: string;
        'Intención (NLP)': string;
        'Consulta tipo (ciudadano)': string;
        'Qué quiere realmente': string;
        'Datos mínimos a solicitar': string;
        'Respuesta (patrón para voz)': string;
        'Tipo de salida': string;
        'Trámite relacionado (ID)': string | null;
        'Normativa relacionada (IDs)': string | null;
        'Fuentes (URL)': string;
        Prioridad: string;
    }>;
}

interface V3DialogFlow {
    meta: any;
    routing: any;
    global_policies: any;
    flows: Array<{
        intent_id: string;
        sector: string;
        intent_nlp: string;
        examples: string[];
        goal: string;
        priority: string;
        dialogue: {
            opening: { say: string; ask_next: boolean };
            slots: Array<{ name: string; question: string; hint: string }>;
            confirmation: { say: string; when: string };
            fulfillment: {
                type: string;
                procedure_id: string | null;
                normative_ids: any[];
                source_url: string;
                handoff: { to_human: boolean; rule: string };
            };
            fallback: { say: string; action: string };
        };
    }>;
}

interface ConversationState {
    currentIntentNlp: string | null;
    currentFlow: any | null;
    slots: Record<string, string>;
    slotIndex: number;
}

// Cache en memoria
let v1Cache: V1Knowledge | null = null;
let v2Cache: V2Intents | null = null;
let v3Cache: V3DialogFlow | null = null;
let isLoading = false;

/**
 * Carga y cachea las 3 bases de conocimiento una sola vez
 */
export async function loadKB(): Promise<{ v1: V1Knowledge; v2: V2Intents; v3: V3DialogFlow }> {
    // Si ya está cargado, devolver cache
    if (v1Cache && v2Cache && v3Cache) {
        return { v1: v1Cache, v2: v2Cache, v3: v3Cache };
    }

    // Evitar carga múltiple simultánea
    if (isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return loadKB();
    }

    isLoading = true;

    try {
        // Cargar los 3 JSONs en paralelo usando fetch
        const [v1Response, v2Response, v3Response] = await Promise.all([
            fetch('./json/BaseConocimiento_Daganzo_V1.json'),
            fetch('./json/BaseConocimiento_Daganzo_V2.json'),
            fetch('./json/Motor_Dialogo_Daganzo_V3.json')
        ]);

        if (!v1Response.ok || !v2Response.ok || !v3Response.ok) {
            throw new Error('Error al cargar bases de conocimiento');
        }

        v1Cache = await v1Response.json();
        v2Cache = await v2Response.json();
        v3Cache = await v3Response.json();

        console.log('✅ Bases de conocimiento cargadas:', {
            v1_tramites: v1Cache.tramites.length,
            v2_intenciones: v2Cache.intenciones.length,
            v3_flows: v3Cache.flows.length
        });

        return { v1: v1Cache, v2: v2Cache, v3: v3Cache };
    } catch (error) {
        console.error('❌ Error cargando Knowledge Base:', error);
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Clasificación simple de intención usando V2
 * Busca coincidencias en ejemplos y consultas tipo
 */
export async function classifyIntent(userText: string): Promise<string | null> {
    const { v2 } = await loadKB();
    const normalizedText = userText.toLowerCase().trim();

    // Palabras clave por intención
    const keywords: Record<string, string[]> = {
        empadronamiento_alta: ['empadron', 'alta', 'registr'],
        volante_empadronamiento: ['volante', 'certificado empadron'],
        estacionar_en_calle: ['aparc', 'estacion', 'calle', 'día 15', 'dias 15'],
        estacionar_dia_15: ['día 15', 'dias 15', 'día quince'],
        licencia_discoteca: ['discoteca', 'sala', 'ocio', 'música'],
        licencia_actividad: ['negocio', 'actividad', 'licencia', 'abrir local'],
        tiempo_actualidad: ['tiempo', 'clima', 'temperatura', 'lluvia', 'mañana'],
        trafico_actualidad: ['tráfico', 'atasco', 'corte', 'carretera'],
        emergencia_112: ['emergencia', 'urgente', 'pelea', 'accidente', 'fuego', 'peligro'],
        pago_recibo: ['pago', 'recibo', 'tasa', 'tributo'],
        cita_previa: ['cita', 'previa', 'hora'],
    };

    // Buscar por keywords
    for (const [intentNlp, keys] of Object.entries(keywords)) {
        if (keys.some(k => normalizedText.includes(k))) {
            return intentNlp;
        }
    }

    // Buscar en ejemplos y consultas de V2
    for (const intent of v2.intenciones) {
        const intentNlp = intent['Intención (NLP)'];
        const consultaTipo = intent['Consulta tipo (ciudadano)'].toLowerCase();

        if (consultaTipo.includes(normalizedText) || normalizedText.includes(consultaTipo.substring(0, 15))) {
            return intentNlp;
        }
    }

    return null; // No se pudo clasificar
}

/**
 * Obtiene el flujo de diálogo de V3 según la intención
 */
export async function getFlow(intentNlp: string): Promise<any | null> {
    const { v3 } = await loadKB();
    return v3.flows.find(f => f.intent_nlp === intentNlp) || null;
}

/**
 * Determina la siguiente pregunta según el estado del diálogo
 */
export function nextQuestion(flow: any, state: ConversationState): string | null {
    if (!flow || !flow.dialogue || !flow.dialogue.slots) return null;

    const slots = flow.dialogue.slots;

    // Buscar el siguiente slot no completado
    for (let i = state.slotIndex; i < slots.length; i++) {
        const slotName = slots[i].name;
        if (!state.slots[slotName]) {
            return slots[i].question;
        }
    }

    return null; // Todos los slots completados
}

/**
 * Verifica si todos los slots necesarios están completados
 */
export function areAllSlotsCollected(flow: any, state: ConversationState): boolean {
    if (!flow || !flow.dialogue || !flow.dialogue.slots) return true;

    const requiredSlots = flow.dialogue.slots.map((s: any) => s.name);
    return requiredSlots.every((slotName: string) => state.slots[slotName]);
}

/**
 * Genera respuesta final usando V1 para fundamentar
 */
export async function fulfill(flow: any, state: ConversationState): Promise<string> {
    const { v1 } = await loadKB();

    if (!flow || !flow.dialogue || !flow.dialogue.fulfillment) {
        return 'Disculpa, no tengo información suficiente para responder a eso en este momento.';
    }

    const fulfillment = flow.dialogue.fulfillment;
    const procedureId = fulfillment.procedure_id;

    // Buscar procedimiento en V1
    let procedureInfo = '';
    if (procedureId) {
        const tramite = v1.tramites.find((t: any) => t['ID trámite'] === procedureId);
        if (tramite) {
            procedureInfo = `

**Procedimiento:** ${tramite['Trámite/Servicio']}
**Descripción:** ${tramite['Descripción breve (voz)']}
**Documentación:** ${tramite['Documentación (resumen)']}
**Pasos:** ${tramite['Pasos del proceso (resumen)']}`;

            if (tramite['URL sede/fuente']) {
                procedureInfo += `\n**Más información:** ${tramite['URL sede/fuente']}`;
            }
        }
    }

    // Respuesta de confirmación + información
    let response = flow.dialogue.confirmation.say;
    if (procedureInfo) {
        response += '\n\n' + procedureInfo;
    }

    return response;
}

/**
 * Función auxiliar para detectar si es una consulta de actualidad (requiere Google Search)
 */
export function needsGoogleSearch(userText: string): boolean {
    const searchKeywords = [
        'tiempo', 'clima', 'temperatura', 'lluvia', 'sol',
        'tráfico', 'atasco', 'corte', 'carretera',
        'noticia', 'hoy', 'ahora', 'actual',
        'mañana', 'próximo', 'eventos'
    ];

    const normalized = userText.toLowerCase();
    return searchKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Detecta emergencias que deben derivarse a 112
 */
export function isEmergency(userText: string): boolean {
    const emergencyKeywords = [
        'emergencia', 'urgente', 'pelea', 'accidente', 'fuego', 'incendio',
        'herido', 'peligro', 'ayuda urgente', '112', 'ambulancia', 'policía ahora'
    ];

    const normalized = userText.toLowerCase();
    return emergencyKeywords.some(keyword => normalized.includes(keyword));
}
