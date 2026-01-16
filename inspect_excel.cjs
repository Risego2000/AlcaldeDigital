const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('BaseConocimiento_Daganzo_Ampliada_CON_INTENCIONES_V2.xlsx');

    // Log sheet names to help identify the right one
    console.log("Sheets found:", workbook.SheetNames);

    // Try to find a sheet that looks like it has normative data
    // Usually named "Normativa", "V1", "Base Conocimiento", etc.
    let targetSheet = workbook.SheetNames.find(s => s.toLowerCase().includes('normativa'));
    if (!targetSheet) targetSheet = workbook.SheetNames[0]; // Default to first if not found

    console.log("Reading sheet:", targetSheet);

    const worksheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null }); // preserve structure

    // Filter/Map to desired structure if possible, or just raw dump first to analyze
    console.log(JSON.stringify(data.slice(0, 5), null, 2)); // Preview first 5 rows

    // If it looks like the right data, we might want to dump all of it
    // console.log(JSON.stringify(data, null, 2));

} catch (e) {
    console.error("Error reading Excel:", e);
}
