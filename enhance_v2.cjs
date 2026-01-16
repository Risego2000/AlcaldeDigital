const fs = require('fs');

// Cargar V2 y V1 (para vincular normativas)
const v2 = JSON.parse(fs.readFileSync('json/BaseConocimiento_Daganzo_V2.json', 'utf8'));
const v1 = JSON.parse(fs.readFileSync('json/BaseConocimiento_Daganzo_V1.json', 'utf8'));

// Mapeo de sectores a normativas relevantes de V1
const sectorToNormativa = {
    'Padrón y Registro': [],
    'Tributos, tasas y recaudación': ['F-1', 'F-2', 'F-3', 'F-4', 'F-11', 'F-13', 'ORD-GEN-001'],
    'Urbanismo y Obras': ['F-5', 'F-6', 'G-20'],
    'Actividades y Aperturas': ['G-19', 'BOE-A-2006-123'],
    'Movilidad, circulación y estacionamiento': ['G-7', 'F-8', 'G-4'],
    'Convivencia, civismo y sanciones': ['G-21'],
    'Medio ambiente y residuos': ['G-2', 'F-11', 'G-13', 'G-8'],
    'Servicios sociales y ayudas': ['G-16', 'G-17', 'G-26'],
    'Educación, cultura y deportes': ['G-10', 'G-11', 'F-15', 'F-19'],
    'Consumo y reclamaciones': [],
    'Participación ciudadana y plenos': [],
    'Emergencias y Protección Civil': ['G-24', 'G-25'],
    'Animales': ['G-1', 'BOE-A-2023-7936']
};

// Función para generar palabras clave desde la consulta
function generateKeywords(consulta, intencionNlp) {
    const keywords = [];

    // Extraer palabras clave de la consulta
    const palabras = consulta.toLowerCase()
        .replace(/[¿?¡!.,]/g, '')
        .split(' ')
        .filter(p => p.length > 3 && !['cómo', 'dónde', 'cuándo', 'quién', 'para', 'puedo', 'tengo', 'necesito', 'quiero'].includes(p));

    keywords.push(...palabras.slice(0, 5));

    // Añadir variantes según la intención
    if (intencionNlp.includes('empadron')) {
        keywords.push('alta padrón', 'censo', 'registrarme', 'darme de alta');
    }
    if (intencionNlp.includes('tributo') || intencionNlp.includes('pago')) {
        keywords.push('recibo', 'impuesto', 'tasa', 'pagar');
    }
    if (intencionNlp.includes('basura') || intencionNlp.includes('residuo')) {
        keywords.push('contenedor', 'reciclaje', 'punto limpio', 'escombros');
    }
    if (intencionNlp.includes('animal') || intencionNlp.includes('perro')) {
        keywords.push('mascota', 'ppp', 'excrementos', 'correa');
    }

    return [...new Set(keywords)]; // Eliminar duplicados
}

// Función para generar ejemplos variados
function generateExamples(consultaTipo, intencionNlp) {
    const ejemplos = [consultaTipo];

    // Generar variaciones automáticas
    if (consultaTipo.includes('¿Cómo')) {
        ejemplos.push(consultaTipo.replace('¿Cómo', 'Cómo hago para'));
        ejemplos.push(consultaTipo.replace('¿Cómo', 'Quiero saber cómo'));
    }
    if (consultaTipo.includes('Quiero')) {
        ejemplos.push(consultaTipo.replace('Quiero', 'Necesito'));
        ejemplos.push(consultaTipo.replace('Quiero', 'Me gustaría'));
    }

    // Añadir forma imperativa
    ejemplos.push(consultaTipo.replace(/^¿/, '').replace(/\?$/, ''));

    return [...new Set(ejemplos)].slice(0, 4);
}

// Función para estandarizar prioridad
function standardizePriority(sector, tipoSalida, intencionNlp) {
    // Alta: Servicios básicos y urgentes
    if (sector.includes('Padrón') ||
        sector.includes('Tributos') ||
        sector.includes('Emergencia') ||
        tipoSalida === 'Emergencia' ||
        intencionNlp.includes('emergencia') ||
        intencionNlp.includes('112')) {
        return 'Alta';
    }

    // Baja: Información general sin trámite
    if (tipoSalida === 'Información' || tipoSalida === 'Derivación') {
        return 'Baja';
    }

    // Media: Todo lo demás
    return 'Media';
}

// Función para vincular normativas según sector
function linkNormativa(sector, intencionNlp) {
    const normativas = [];

    // Buscar por sector
    for (const [sectorKey, norms] of Object.entries(sectorToNormativa)) {
        if (sector.includes(sectorKey)) {
            normativas.push(...norms);
        }
    }

    // Búsqueda específica por intención
    if (intencionNlp.includes('ibi') || intencionNlp.includes('contribucion')) {
        normativas.push('F-1', 'ORD-FIS-001');
    }
    if (intencionNlp.includes('ivtm') || intencionNlp.includes('circulacion')) {
        normativas.push('F-3', 'ORD-FIS-003');
    }
    if (intencionNlp.includes('basura') || intencionNlp.includes('residuo')) {
        normativas.push('F-11', 'G-2', 'ORD-TAS-004');
    }
    if (intencionNlp.includes('agua')) {
        normativas.push('F-13', 'ORD-TAS-005');
    }
    if (intencionNlp.includes('animal') || intencionNlp.includes('perro')) {
        normativas.push('G-1', 'ORD-GEN-002');
    }

    return normativas.length > 0 ? [...new Set(normativas)] : null;
}

// Procesar todas las intenciones
console.error(`Procesando ${v2.intenciones.length} intenciones...`);

v2.intenciones = v2.intenciones.map((intencion, index) => {
    if (index % 50 === 0) {
        console.error(`Procesadas ${index}/${v2.intenciones.length}...`);
    }

    return {
        ...intencion,
        "Palabras clave": generateKeywords(intencion['Consulta tipo (ciudadano)'], intencion['Intención (NLP)']),
        "Ejemplos": generateExamples(intencion['Consulta tipo (ciudadano)'], intencion['Intención (NLP)']),
        "Normativa relacionada (IDs)": linkNormativa(intencion.Sector, intencion['Intención (NLP)']),
        "Prioridad": standardizePriority(intencion.Sector, intencion['Tipo de salida'], intencion['Intención (NLP)'])
    };
});

console.error('✅ Procesamiento completado.');
console.log(JSON.stringify(v2, null, 2));
