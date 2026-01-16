const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('BaseConocimiento_Daganzo_Ampliada_CON_INTENCIONES_V2.xlsx');
const worksheet = workbook.Sheets['Normativa'];
const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

const cleanData = rawData.map(row => {
    // Construct keywords from sector and title
    let keywords = [];
    if (row['Sector / materia']) keywords.push(row['Sector / materia']);

    // Clean URL
    let url = row['PDF (enlace)'] || '';
    if (url && !url.startsWith('http')) {
        // sometimes urls are just text or broken
    }

    return {
        ID: row['Identificador'] || row['ID'] || '',
        Nombre: row['Título'] || row['Nombre'] || '',
        Tipo: row['Rango normativo'] || row['Tipo'] || 'General',
        Descripcion: row['Descripción'] || row['Descripcion'] || row['Sector / materia'] || '',
        URL: url,
        "Palabras clave": keywords
    };
}).filter(item => item.ID && item.Nombre); // Filter invalid rows

// Read existing JSON to append
const v1Path = 'json/BaseConocimiento_Daganzo_V1.json';
let v1Data = {};
try {
    v1Data = JSON.parse(fs.readFileSync(v1Path, 'utf8'));
} catch (e) {
    console.error("Error reading V1:", e);
    process.exit(1);
}

// Remove previously manually added "normativa" to replace with full list?
// Or merge? User said "incluir todas". Best to replace "normativa" section to ensure sync with Excel.
// But I should check if I should keep the ones I added manually if they are NOT in Excel.
// The Excel seems to be "Ampliada", so it likely contains everything. 
// I will REPLACE the normativa array with the Excel content to avoid duplicates, 
// OR I will merge by ID.
// Let's merge by ID.

const existingNorms = v1Data.normativa || [];
const newNorms = cleanData;

// Create a map by ID
const normMap = new Map();
existingNorms.forEach(n => normMap.set(n.ID, n));
newNorms.forEach(n => normMap.set(n.ID, n)); // Excel overrides/adds

v1Data.normativa = Array.from(normMap.values());

console.log(JSON.stringify(v1Data, null, 2));
