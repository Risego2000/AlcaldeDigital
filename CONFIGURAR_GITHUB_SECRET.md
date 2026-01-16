# Configuración de GitHub Secret para GEMINI_API_KEY

## ⚠️ IMPORTANTE: Debes configurar el secret manualmente en GitHub

### Pasos para configurar el secret:

1. **Ve a tu repositorio en GitHub**:
   https://github.com/Risego2000/AlcaldeDigital

2. **Accede a Settings** (Configuración):
   - Haz clic en la pestaña "Settings" en la parte superior del repositorio

3. **Ve a Secrets and variables**:
   - En el menú lateral izquierdo, busca "Secrets and variables"
   - Haz clic en "Actions"

4. **Crea un nuevo secret**:
   - Haz clic en el botón verde "New repository secret"
   
5. **Configura el secret**:
   - **Name**: `GEMINI_API_KEY` (exactamente así, en mayúsculas)
   - **Secret**: Pega tu nueva API key de Gemini (la que acabas de generar)
   - Haz clic en "Add secret"

### ✅ Verificación

Una vez configurado el secret:
- El workflow de GitHub Actions (`.github/workflows/static.yml`) ya está configurado para usarlo
- En la línea 37 del workflow verás: `GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}`
- Esto inyectará la API key de forma segura durante el build, sin exponerla en el código

### 🚀 Deploy automático

Después de configurar el secret:
- Cada push a la rama `main` activará automáticamente el deploy a GitHub Pages
- La aplicación se desplegará en: https://risego2000.github.io/AlcaldeDigital/
- La API key estará protegida y solo se usará durante el build

### 📝 Notas de seguridad

✅ **Protecciones implementadas**:
- `.env.local` eliminado del repositorio y del historial de Git
- `.gitignore` actualizado para ignorar todos los archivos `.env*`
- GitHub Actions configurado para usar secrets
- Instrucciones del agente actualizadas: no solicita datos personales, no inicia trámites

⚠️ **Recuerda**:
- La API key antigua (`AIzaSyBHSQw0fXY7uhjOU9c_tnACPCVRBNIsTZE`) debe ser REVOCADA en Google AI Studio
- Nunca compartas la nueva API key públicamente
- El archivo `.env.local` local debe contener la nueva API key para desarrollo local
