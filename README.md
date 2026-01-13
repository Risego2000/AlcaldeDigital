
# 🏛️ Daganzo Atiende - Despliegue en GitHub

Este repositorio contiene la **Oficina Virtual de Manuel Jurado Marrufo**, Alcalde de Daganzo de Arriba. Utiliza la tecnología **Gemini 2.5 Flash Native Audio** para una interacción de voz con latencia ultra baja.

## 🚀 Cómo desplegar este proyecto

1. **Sube el código**: Crea un repositorio en GitHub y sube todos los archivos de esta carpeta.
2. **Activa GitHub Pages**:
   - Ve a `Settings` > `Pages`.
   - En `Build and deployment`, cambia la fuente a **GitHub Actions**.
3. **Espera el despliegue**: GitHub detectará automáticamente el archivo `.github/workflows/static.yml` y desplegará tu sitio.

## 🔑 Nota sobre la API Key

La aplicación está diseñada para entornos que inyectan `process.env.API_KEY`. 
- Si usas el entorno de **AI Studio**, la clave se gestiona automáticamente a través del diálogo de selección integrado en la app.
- Para despliegues manuales, asegúrate de configurar la clave de API de Google AI Studio.

## 🛠️ Tecnologías
- **React 19** + **ESM**
- **Tailwind CSS** para un diseño institucional premium.
- **Google Gemini API** (Live Mode).
