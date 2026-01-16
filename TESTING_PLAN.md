# 🧪 Plan de Pruebas Exhaustivas - Agente de Voz Manuel Jurado

## 📋 Objetivo
Validar todas las capacidades del agente de voz con casos reales de uso, desde consultas básicas hasta escenarios complejos.

---

## 🟢 NIVEL 1: Pruebas Básicas (Happy Path)

### 1.1 Información General
**Objetivo:** Verificar respuestas informativas sin trámite

✅ **Ejemplos:**
- "¿Cuál es el horario del Ayuntamiento?"
- "¿Cómo pido cita previa?"
- "Quiero saber dónde está el punto limpio"
- "¿Qué días pasa el mercadillo?"

**Expectativa:** Respuesta directa sin solicitar datos adicionales.

---

### 1.2 Padrón y Registro
**Objetivo:** Verificar flujo completo de recogida de datos

✅ **Ejemplos:**
- "¿Cómo me empadrono en Daganzo?"
  - *Debe preguntar:* domicilio, titular/inquilino, nº de personas
- "Necesito un volante de empadronamiento"
  - *Debe preguntar:* para qué trámite, si es individual o familiar
- "Quiero dar de baja mi padrón"
  - *Debe preguntar:* motivo (mudanza/fallecimiento), nueva dirección

**Expectativa:** El agente debe hacer preguntas específicas y luego dar pasos completos.

---

### 1.3 Tributos y Pagos
**Objetivo:** Verificar vinculación de normativas fiscales

✅ **Ejemplos:**
- "¿Cómo pago el IBI?"
  - *Debe citar:* Ordenanza F-1, ORD-FIS-001
  - *Debe explicar:* plazos, domiciliación, pago online
- "¿Cuánto cuesta el impuesto del coche?"
  - *Debe citar:* F-3, ORD-FIS-003 (IVTM)
  - *Debe preguntar:* tipo de vehículo, potencia
- "No puedo pagar mi recibo de basuras"
  - *Debe mencionar:* fraccionamiento, bonificaciones
  - *Debe citar:* F-11, ORD-TAS-004

**Expectativa:** El agente debe citar la normativa aplicable y explicar opciones.

---

## 🟡 NIVEL 2: Pruebas Intermedias (Casos Específicos)

### 2.1 Urbanismo y Licencias
**Objetivo:** Verificar gestión de documentación requerida

✅ **Ejemplos:**
- "Quiero reformar mi cocina, ¿necesito licencia?"
  - *Debe preguntar:* tipo de obra (menor/mayor), si afecta estructura
  - *Debe citar:* F-5 (ICIO), F-6 (Tasa licencias)
- "Voy a abrir una discoteca"
  - *Debe solicitar:* proyecto técnico, aforo, medidas acústicas
  - *Debe citar:* G-19 (Actividades)
- "¿Puedo hacer una terraza en mi bar?"
  - *Debe citar:* ORD-GEN-005 (Terrazas y Veladores)

**Expectativa:** Debe diferenciar trámites según complejidad y citar normativa específica.

---

### 2.2 Movilidad y Estacionamiento
**Objetivo:** Verificar conocimiento de normas locales específicas

✅ **Ejemplos:**
- "¿Puedo aparcar el día 15 en calle Mayor?"
  - *Debe preguntar:* número exacto, señalización visible
  - *Debe explicar:* regla del día 15 si aplica
  - *Debe citar:* G-7 (Circulación)
- "Necesito un vado permanente"
  - *Debe citar:* F-10, ORD-TAS-003 (Tasa vados)
  - *Debe preguntar:* ancho del garaje, ubicación
- "Me han puesto una multa por aparcar mal"
  - *Debe explicar:* cómo recurrir, plazos
  - *Debe citar:* G-21 (Convivencia), procedimiento sancionador

**Expectativa:** Debe aplicar normativa local específica de Daganzo.

---

### 2.3 Animales y Convivencia
**Objetivo:** Verificar conocimiento de nueva legislación

✅ **Ejemplos:**
- "¿Cómo registro a mi perro?"
  - *Debe citar:* G-1, ORD-GEN-002, Ley 7/2023 (Bienestar Animal)
  - *Debe preguntar:* chip, vacunas, raza PPP
- "Mi vecino tiene un perro que ladra toda la noche"
  - *Debe explicar:* horarios, denuncia por ruidos
  - *Debe citar:* G-21 (Convivencia)
- "¿Puedo llevar a mi perro suelto al parque?"
  - *Debe explicar:* zonas caninas, obligación correa
  - *Debe citar:* G-1

**Expectativa:** Debe mencionar ley nacional reciente (7/2023) y ordenanza local.

---

## 🔴 NIVEL 3: Pruebas Avanzadas (Edge Cases)

### 3.1 Interrupciones y Cambios de Tema
**Objetivo:** Verificar "barge-in" y gestión de contexto

✅ **Ejemplos:**
- Empezar: "¿Cómo me empadrono?"
  - *Agente pregunta domicilio*
- **INTERRUMPIR:** "Espera, mejor dime cómo pago el IBI"
  - *Debe:* Cambiar de tema sin repetir saludo inicial

**Expectativa:** El agente debe gestionar interrupciones sin perder contexto.

---

### 3.2 Consultas Ambiguas
**Objetivo:** Verificar capacidad de desambiguación

✅ **Ejemplos:**
- "¿Cómo pago?"
  - *Debe preguntar:* "¿Qué quieres pagar? (impuesto, tasa, multa...)"
- "Mi recibo"
  - *Debe preguntar:* "¿Qué recibo? (IBI, basura, agua...)"
- "Necesito un certificado"
  - *Debe preguntar:* "¿Qué certificado? (padrón, residencia fiscal, catastro...)"

**Expectativa:** Debe hacer preguntas de clarificación específicas.

---

### 3.3 Casos Complejos Multisectoriales
**Objetivo:** Verificar navegación entre sectores

✅ **Ejemplos:**
- "Voy a abrir un restaurante con terraza"
  - *Debe cubrir:*
    - Licencia actividad (G-19)
    - Terraza (ORD-GEN-005)
    - Tasas (F-6)
    - Normativa sanitaria
- "Me he mudado y tengo un perro"
  - *Debe cubrir:*
    - Cambio padrón (PAD-01)
    - Registro animal (G-1)
    - Cambio tributos (notificación IBI)

**Expectativa:** Debe guiar en todos los trámites relacionados sin perder ninguno.

---

## 🚨 NIVEL 4: Casos Críticos

### 4.1 Emergencias (Derivación a 112)
**Objetivo:** Verificar protocolo de emergencias

✅ **Ejemplos:**
- "Hay un incendio en mi edificio"
  - *Debe:* Decir "Llama YA al 112" + ofrecer ayuda post-emergencia
- "Mi vecino me está amenazando"
  - *Debe:* Derivar a 112/Policía Local inmediatamente
- "Hay un perro agresivo suelto"
  - *Debe:* Valorar urgencia, derivar si es peligro inmediato

**Expectativa:** Debe priorizar seguridad y derivar correctamente.

---

### 4.2 Actualidad (Google Search)
**Objetivo:** Verificar uso de Google Search para info temporal

✅ **Ejemplos:**
- "¿Qué tiempo va a hacer mañana?"
  - *Debe:* Usar Google Search para clima local
- "¿Hay cortes de tráfico hoy en la M-100?"
  - *Debe:* Buscar noticias actuales de tráfico
- "¿Hay algún evento en el pueblo este fin de semana?"
  - *Debe:* Buscar agenda cultural/fiestas

**Expectativa:** NO debe inventar. Debe decir "Buscando información actualizada..." y usar Google.

---

## 🧩 NIVEL 5: Casos de Integración

### 5.1 Verificación de Normativa Citada
**Objetivo:** Confirmar que cita IDs correctos

✅ **Ejemplos a verificar:**
- "Basura" → Debe mencionar: G-2, F-11, ORD-TAS-004
- "Agua" → Debe mencionar: F-13, ORD-TAS-005
- "IBI" → Debe mencionar: F-1, ORD-FIS-001
- "IVTM" → Debe mencionar: F-3, ORD-FIS-003
- "Animales" → Debe mencionar: G-1, ORD-GEN-002, BOE-A-2023-7936

**Expectativa:** Los IDs deben coincidir con V1.

---

### 5.2 Palabras Clave Coloquiales
**Objetivo:** Verificar detección con lenguaje informal

✅ **Ejemplos:**
- "El numerito del coche" → Reconocer como IVTM
- "La contri" → Reconocer como IBI
- "Punto limpio" → Reconocer como residuos
- "Caca de perro" → Reconocer como animales/convivencia
- "Multa de tráfico" → Reconocer como sanciones

**Expectativa:** Debe entender jerga local y sinónimos.

---

## 📊 Checklist de Validación

### ✅ Funcionalidades Core
- [ ] Saludo inicial automático
- [ ] Detección correcta de intención (>80% precisión)
- [ ] Recogida de slots necesarios
- [ ] Citación de normativa cuando aplica
- [ ] Respuesta fundamentada con pasos claros
- [ ] Despedida natural

### ✅ Capacidades Avanzadas
- [ ] Interrupciones mid-sentence (barge-in)
- [ ] Cambio de tema fluido
- [ ] Desambiguación de consultas vagas
- [ ] Uso de Google Search para actualidad
- [ ] Derivación a 112 en emergencias
- [ ] Acento español nativo (sin deje anglosajón)

### ✅ Cobertura de Sectores (12 sectores)
- [ ] Padrón y Registro
- [ ] Tributos y Tasas
- [ ] Urbanismo y Obras
- [ ] Actividades y Aperturas
- [ ] Movilidad y Circulación
- [ ] Convivencia y Sanciones
- [ ] Medio Ambiente y Residuos
- [ ] Servicios Sociales
- [ ] Educación y Cultura
- [ ] Consumo y Reclamaciones
- [ ] Participación Ciudadana
- [ ] Emergencias y Protección Civil

---

## 🎯 Métricas de Éxito

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| Precisión de intención | >85% | Usuario confirma que entendió |
| Cita normativa correcta | 100% | IDs coinciden con V1 |
| Tiempo de respuesta | <3 seg | Medición técnica |
| Acento español | 100% | Evaluación subjetiva |
| Gestión emergencias | 100% | Deriva correctamente a 112 |
| Uso Google Search | 100% | Para tiempo/tráfico/actualidad |

---

## 📝 Registro de Pruebas

Crea una tabla para documentar:

| # | Consulta | Intención Detectada | Normativa Citada | Respuesta Correcta | Observaciones |
|---|----------|---------------------|------------------|--------------------|---------------|
| 1 | "¿Cómo pago el IBI?" | pago_ibi | F-1, ORD-FIS-001 | ✅ Sí | Explicó domiciliación |
| 2 | "El numerito del coche" | pago_ivtm | F-3, ORD-FIS-003 | ✅ Sí | Reconoció jerga |
| 3 | ... | ... | ... | ... | ... |

---

## 🚀 Pruebas de Estrés (Opcionales)

- **Consultas encadenadas:** 5+ preguntas seguidas sin pausa
- **Acentos regionales:** Probar con distintos acentos españoles
- **Ruido ambiental:** Probar con música/conversaciones de fondo
- **Velocidad variable:** Hablar muy rápido / muy despacio
- **Interrupciones múltiples:** Cambiar de tema 3+ veces

---

**Autor:** Sistema de Testing AlcaldeDigital  
**Versión:** 1.0 (2026-01-16)  
**Cobertura:** 526 intenciones | 148 normativas | 12 sectores
