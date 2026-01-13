# Plan de Implementación - Arquitectura 3 Capas

## 📋 Resumen Ejecutivo

Se ha implementado una arquitectura de conocimiento de 3 capas para la aplicación de voz "Daganzo Atiende - Oficina Virtual". Esta arquitectura separa:
- **V1**: Base de conocimiento (normativa, trámites, FAQs)
- **V2**: Clasificación de intenciones (lenguaje ciudadano)
- **V3**: Motor de diálogo (flujos con slots mínimos)

## 🎯 Objetivos Cumplidos

✅ **NO usar imports con "@/"** - Solo rutas relativas y fetch  
✅ **Cargar JSONs de forma robusta** - Fetch + cache en memoria  
✅ **Módulo knowledge.ts** - Funciones para clasificar, ejecutar flujos y generar respuestas  
✅ **SYSTEM_INSTRUCTION actualizado** - Instrucciones claras para las 3 capas  
✅ **Google Search solo para actualidad** - Tiempo, tráfico, noticias  
✅ **Saludo obligatorio** - "Hola, soy Manuel Jurado..."  

---

## 📂 Archivos Modificados

### 1. **`knowledge.ts`** (NUEVO)
**Propósito**: Módulo principal de gestión de conocimiento

**Funciones principales**:
```typescript
loadKB()                    // Carga y cachea V1/V2/V3 una vez
classifyIntent(userText)    // Clasifica intención usando V2
getFlow(intentNlp)         // Obtiene flujo de V3
nextQuestion(flow, state)   // Siguiente slot no cubierto
areAllSlotsCollected()      // Verifica si completó slots
fulfill(flow, state)        // Genera respuesta con V1
needsGoogleSearch()         // Detecta si necesita búsqueda web
isEmergency()              // Detecta emergencias → 112
```

**Características**:
- ✅ Usa `fetch('/json/...')` sin alias "@/"
- ✅ Cache en memoria (no recarga los JSON)
- ✅ Clasificación simple por keywords + matching
- ✅ Búsqueda de trámites en V1 por procedure_id
- ✅ Detección de emergencias y actualidad

---

### 2. **`constants.ts`** (MODIFICADO)
**Cambios**: SYSTEM_INSTRUCTION completamente reescrito

**Nuevo enfoque**:
```
IDENTIDAD Y ROL
↓
ARQUITECTURA 3 CAPAS (V1, V2, V3)
↓
GOOGLE SEARCH - USO ESPECÍFICO
↓
EMERGENCIAS
↓
INFORMACIÓN MUNICIPAL
↓
ESTILO DE CONVERSACIÓN
↓
REGLAS DE ORO
```

**Instrucciones clave para Gemini**:
- V1: Fundamentar respuestas (NUNCA inventar leyes)
- V2: Intención ya clasificada
- V3: PedirSOLO slots necesarios
- Google Search: SOLO actualidad (aviso previo: "Espera un segundo...")
- Emergencias: Derivar a 112
- Saludo: "Hola, soy Manuel Jurado, vuestro alcalde..."

---

### 3. **`public/json/`** (NUEVO)
**Acción**: Copiados los 3 archivos JSON a `public/`

```
public/
  ├── json/
  │   ├── BaseConocimiento_Daganzo_V1.json  (34KB)
  │   ├── BaseConocimiento_Daganzo_V2.json  (353KB)
  │   └── Motor_Dialogo_Daganzo_V3.json     (860KB)
```

**Por qué**: Vite sirve archivos de `public/` en la raíz del servidor, permitiendo `fetch('/json/...')`

---

## 🔧 Próximos Pasos

### Paso 1: Modificar `App.tsx`
**Objetivo**: Integrar el módulo `knowledge.ts` en la lógica de conversación

**Cambios necesarios**:

```typescript
import { loadKB, classifyIntent, getFlow, nextQuestion, areAllSlotsCollected, fulfill, needsGoogleSearch, isEmergency } from './knowledge';

// Estado de conversación
const [conversationState, setConversationState] = useState({
  currentIntentNlp: null,
  currentFlow: null,
  slots: {},
  slotIndex: 0
});

// Al iniciar, cargar KB
useEffect(() => {
  loadKB().catch(err => console.error('Error cargando KB:', err));
}, []);

// Al recibir mensaje del usuario
async function handleUserMessage(userText: string) {
  // 1. Detectar emergencias
  if (isEmergency(userText)) {
    return "Esto es una emergencia. Llama YA al 112 si hay riesgo para personas.";
  }
  
  // 2. Detectar si necesita Google Search
  if (needsGoogleSearch(userText)) {
    // Avisar antes de buscar
    await speakText("Espera un segundo que lo consulto ahora mismo...");
    // Gemini usará Google Search automáticamente
    return; // Dejar que Gemini maneje la búsqueda
  }
  
  // 3. Clasificar intención
  if (!conversationState.currentIntentNlp) {
    const intentNlp = await classifyIntent(userText);
    if (!intentNlp) {
      return "Disculpa, no he entendido bien. ¿Podrías ser más específico?";
    }
    
    const flow = await getFlow(intentNlp);
    setConversationState({
      currentIntentNlp: intentNlp,
      currentFlow: flow,
      slots: {},
      slotIndex: 0
    });
    
    // Dar opening del flujo
    return flow.dialogue.opening.say;
  }
  
  // 4. Recoger slots
  const flow = conversationState.currentFlow;
  const slots = flow.dialogue.slots;
  
  // Guardar respuesta en el slot actual
  const currentSlot = slots[conversationState.slotIndex];
  setConversationState(prev => ({
    ...prev,
    slots: { ...prev.slots, [currentSlot.name]: userText },
    slotIndex: prev.slotIndex + 1
  }));
  
  // 5. Pedir siguiente slot o finalizar
  if (!areAllSlotsCollected(flow, conversationState)) {
    const nextQ = nextQuestion(flow, conversationState);
    return nextQ;
  } else {
    // Todos los slots completados → generar respuesta final
    const finalResponse = await fulfill(flow, conversationState);
    
    // Reset estado
    setConversationState({
      currentIntentNlp: null,
      currentFlow: null,
      slots: {},
      slotIndex: 0
    });
    
    return finalResponse;
  }
}
```

### Paso 2: Pruebas Manuales
Ejecutar las pruebas especificadas:

#### Test 1: Empadronamiento
```
Usuario: "Quiero empadronarme"
Esperado:
1. Clasificar → empadronamiento_alta
2. Pedir: domicilio, si es titular/inquilino, nº personas
3. Responder con pasos de PAD-01 (V1)
```

#### Test 2: Estacionamiento
```
Usuario: "¿Puedo aparcar hoy en la calle Mayor?"
Esperado:
1. Clasificar → estacionar_en_calle
2. Pedir: tramo, horario, señales visibles
3. Responder consultando ordenanza (V1: MOV-03)
```

#### Test 3: Actualidad (Google Search)
```
Usuario: "¿Qué tiempo hace mañana en Daganzo?"
Esperado:
1. Detectar needsGoogleSearch() → true
2. Decir: "Espera un segundo que lo consulto ahora mismo..."
3. Usar Google Search para responder
```

#### Test 4: Emergencia
```
Usuario: "Hay una pelea ahora mismo en la plaza"
Esperado:
1. Detectar isEmergency() → true
2. Responder inmediatamente: "Esto es una emergencia. Llama YA al 112..."
```

---

## 📊 Estructura de Datos

### V1 - BaseConocimiento_Daganzo_V1.json
```json
{
  "tramites": [
    {
      "ID trámite": "PAD-01",
      "Trámite/Servicio": "Alta/Empadronamiento",
      "Descripción breve (voz)": "...",
      "Documentación (resumen)": "...",
      "Pasos del proceso (resumen)": "...",
      "URL sede/fuente": "..."
    }
  ],
  "faqs": [...],
  "glosario": [...],
  "fuentes": [...]
}
```

### V2 - BaseConocimiento_Daganzo_V2.json
```json
{
  "intenciones": [
    {
      "ID": "INT-0005",
      "Intención (NLP)": "empadronamiento_alta",
      "Consulta tipo (ciudadano)": "¿Cómo me empadrono?",
      "Qué quiere realmente": "Dar de alta en el padrón",
      "Datos mínimos a solicitar": "Domicilio, titular/inquilino, nº personas",
      "Trámite relacionado (ID)": "PAD-01"
    }
  ]
}
```

### V3 - Motor_Dialogo_Daganzo_V3.json
```json
{
  "flows": [
    {
      "intent_nlp": "empadronamiento_alta",
      "dialogue": {
        "opening": { "say": "Te indico requisitos..." },
        "slots": [
          { "name": "domicilio", "question": "¿Cuál es tu domicilio?" },
          { "name": "si_eres_titular", "question": "¿Eres titular o inquilino?" }
        ],
        "confirmation": { "say": "Perfecto, con esa información..." },
        "fulfillment": {
          "procedure_id": "PAD-01",
          "source_url": "https://..."
        }
      }
    }
  ]
}
```

---

## ⚠️ Notas Importantes

1. **Sin alias "@/"**: Todo usa rutas relativas (`./knowledge`) o absolutas (`/json/...`)

2. **Fetch no import**: Los JSONs se cargan por `fetch()` en tiempo de ejecución, NO con `import`

3. **Cache persistente**: `loadKB()` solo carga una vez, luego devuelve cache

4. **Google Search limitado**: SOLO para actualidad (tiempo, tráfico, noticias)

5. **V1 es autoridad**: Nunca inventar leyes, siempre fundamentar con V1

---

## 🚀 Cómo Ejecutar

1. **Instalar dependencias** (ya hecho):
   ```bash
   npm install
   ```

2. **Iniciar dev server**:
   ```bash
   npm run dev
   ```

3. **Acceder**: http://localhost:3000

4. **Probar**:
   - Click en "Hablar con Manuel Jurado"
   - Esperar saludo automático
   - Hacer consultas de prueba

---

## 📝 Checklist

- [x] Crear `knowledge.ts` con funciones de 3 capas
- [x] Actualizar `constants.ts` con nuevo SYSTEM_INSTRUCTION
- [x] Copiar JSONs a `public/json/`
- [ ] Modificar `App.tsx` para usar `knowledge.ts`
- [ ] Probar: "Quiero empadronarme"
- [ ] Probar: "¿Puedo aparcar el día 15?"
- [ ] Probar: "¿Qué tiempo hace mañana?"
- [ ] Probar: "Hay una pelea en la plaza"
- [ ] Verificar que no use Google Search para trámites
- [ ] Verificar saludo automático al conectar

---

## 🎓 Conclusión

El sistema ahora tiene una arquitectura robusta de 3 capas que:
- Fundamenta respuestas en normativa real (V1)
- Clasifica intenciones del ciudadano (V2)
- Ejecuta diálogos estructurados con slots mínimos (V3)
- Usa Google Search SOLO para actualidad
- Detecta emergencias y deriva a 112
- Saluda automáticamente como Manuel Jurado

**Próximo paso crítico**: Integrar `knowledge.ts` en `App.tsx` para completar el flujo end-to-end.
