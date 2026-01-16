const XLSX = require('xlsx');

const workbook = XLSX.readFile('BaseConocimiento_Daganzo_Ampliada_CON_INTENCIONES_V2.xlsx');
const worksheet = workbook.Sheets['Normativa'];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

if (rawData.length > 0) {
    console.error("First row keys:", Object.keys(rawData[0]));
    console.error("First row:", rawData[0]);
} else {
    console.error("No data found in sheet.");
}

// Map columns to our V1 schema
const cleanData = rawData.map(row => {
    // Helper to find key case-insensitively just in case
    const getVal = (keys) => {
        for (let k of keys) {
            if (row[k] !== undefined) return row[k];
            // search trimming
            const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
            if (found) return row[found];
        }
        return '';
    };

    let keywords = getVal(['Palabras clave', 'Tags', 'Keywords']);
    if (typeof keywords === 'string') {
        keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
    } else if (!Array.isArray(keywords)) {
        keywords = [];
    }

    return {
        ID: getVal(['ID', 'Id', 'Código', 'Identificador']),
        Nombre: getVal(['Nombre', 'Norma', 'Título']),
        Tipo: getVal(['Tipo', 'Categoría']),
        Descripcion: getVal(['Descripción', 'Description', 'Resumen']),
        URL: getVal(['PDF (enlace)', 'URL', 'Link', 'Enlace']),
        "Palabras clave": keywords
    };
}).filter(item => item.ID);

console.log(JSON.stringify(cleanData, null, 2));
