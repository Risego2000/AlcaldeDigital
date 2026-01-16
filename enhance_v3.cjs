const fs = require('fs');

// Cargar V2 (mejorado) y V3
const v2 = JSON.parse(fs.readFileSync('json/BaseConocimiento_Daganzo_V2.json', 'utf8'));
const v3 = JSON.parse(fs.readFileSync('json/Motor_Dialogo_Daganzo_V3.json', 'utf8'));

// Crear mapeo de intenciones V2 por ID para búsqueda rápida
const v2Map = new Map();
v2.intenciones.forEach(int => {
    v2Map.set(int.ID, int);
});

// Fallbacks contextuales por sector
const fallbacksBySector = {
    'Padrón y Registro': {
        say: 'Para ayudarte con el padrón, necesito saber: ¿es alta nueva, cambio de domicilio o baja? Y si tienes el documento de tu vivienda a mano.',
        action: 'request_missing_slots'
    },
    'Tributos, tasas y recaudación': {
        say: 'Para localizar tu recibo, dime: ¿qué impuesto es (IBI, circulación, basura, agua)? Y si tienes el número de referencia o el año.',
        action: 'request_missing_slots'
    },
    'Urbanismo y Obras': {
        say: 'Para tramitar tu licencia, necesito: ¿qué tipo de obra es (menor, mayor, reforma)? ¿Tienes proyecto técnico? Y la dirección exacta.',
        action: 'request_missing_slots'
    },
    'Actividades y Aperturas': {
        say: 'Para tu licencia de actividad, dime: ¿qué tipo de local (hostelería, comercio, oficina)? ¿Tienes proyecto de actividad? Y la ubicación.',
        action: 'request_missing_slots'
    },
    'Movilidad, circulación y estacionamiento': {
        say: 'Para consultas de tráfico, necesito: la calle exacta, el número si lo tienes, y si hay señalización visible que hayas visto.',
        action: 'request_missing_slots'
    },
    'Convivencia, civismo y sanciones': {
        say: 'Para denuncias o sanciones, dime: ¿es una denuncia que quieres presentar o un recurso a una multa? Ubicación y fecha aproximada.',
        action: 'request_missing_slots'
    },
    'Medio ambiente y residuos': {
        say: 'Para residuos, indícame: ¿qué tipo de residuo es (muebles, escombros, poda, electrodomésticos)? Y si necesitas recogida o es para punto limpio.',
        action: 'request_missing_slots'
    },
    'Servicios sociales y ayudas': {
        say: 'Para ayudas sociales, necesito saber: ¿qué tipo de ayuda buscas (emergencia, dependencia, transporte)? Y si ya tienes expediente abierto.',
        action: 'request_missing_slots'
    },
    'Educación, cultura y deportes': {
        say: 'Para actividades, dime: ¿es inscripción nueva o renovación? ¿Para qué actividad o servicio? Y la edad del participante si aplica.',
        action: 'request_missing_slots'
    },
    'Consumo y reclamaciones': {
        say: 'Para reclamaciones, necesito: ¿es un problema con un comercio, servicio o producto? Descripción breve del problema y si tienes factura o justificante.',
        action: 'request_missing_slots'
    },
    'Participación ciudadana y plenos': {
        say: 'Para participación, dime: ¿quieres presentar una queja, sugerencia o consultar actas? Y sobre qué tema.',
        action: 'request_missing_slots'
    },
    'Emergencias y Protección Civil': {
        say: 'Si es una emergencia activa, llama al 112. Si es una consulta de protección civil, dime qué necesitas (plan de emergencia, aviso temporal, etc).',
        action: 'request_missing_slots'
    }
};

// Fallback genérico para sectores no mapeados
const fallbackGenerico = {
    say: 'Para ayudarte mejor, necesito algunos datos adicionales. ¿Qué información específica buscas?',
    action: 'request_missing_slots'
};

console.error(`Mejorando ${v3.flows.length} flujos...`);

v3.flows = v3.flows.map((flow, index) => {
    if (index % 50 === 0) {
        console.error(`Procesados ${index}/${v3.flows.length}...`);
    }

    const intentV2 = v2Map.get(flow.intent_id);

    // 1. Importar ejemplos desde V2
    let examples = flow.examples;
    if (intentV2 && intentV2.Ejemplos && intentV2.Ejemplos.length > 0) {
        examples = intentV2.Ejemplos;
    }

    // 2. Importar normativas desde V2
    let normative_ids = flow.dialogue.fulfillment.normative_ids || [];
    if (intentV2 && intentV2['Normativa relacionada (IDs)'] && intentV2['Normativa relacionada (IDs)'].length > 0) {
        normative_ids = intentV2['Normativa relacionada (IDs)'];
    }

    // 3. Asignar fallback contextual según sector
    let fallback = fallbackGenerico;
    for (const [sectorKey, fallbackData] of Object.entries(fallbacksBySector)) {
        if (flow.sector.includes(sectorKey)) {
            fallback = fallbackData;
            break;
        }
    }

    return {
        ...flow,
        examples: examples,
        dialogue: {
            ...flow.dialogue,
            fulfillment: {
                ...flow.dialogue.fulfillment,
                normative_ids: normative_ids
            },
            fallback: fallback
        }
    };
});

console.error('✅ Mejoras completadas.');
console.log(JSON.stringify(v3, null, 2));
