# Configuración de Eleven Labs API

## ⚠️ IMPORTANTE: Plan Pago Requerido

**Eleven Labs requiere un plan pago para usar voces de librería vía API.**

### Planes Disponibles:
- **Starter**: $5/mes = 30,000 caracteres
- **Creator**: $22/mes = 100,000 caracteres
- **Pro**: $99/mes = 500,000 caracteres

### Alternativas Gratuitas:
Si no tienes plan pago, el sistema automáticamente proporciona:
- Instrucciones para Web Speech API
- Google Translate TTS
- Otras herramientas gratuitas

## Paso 1: Obtener API Key de Eleven Labs

1. Ve a [https://elevenlabs.io/app/profile](https://elevenlabs.io/app/profile)
2. Regístrate o inicia sesión
3. **Actualiza a un plan pago** (Starter mínimo recomendado)
4. Ve a la sección "API Keys"
5. Crea una nueva API Key
6. Copia la API Key

## Paso 2: Configurar la API Key

### En desarrollo local (.env.local):
```bash
ELEVEN_LABS_API_KEY="tu_api_key_aqui"
```

### En Vercel (producción):
1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a Settings > Environment Variables
4. Agrega la variable: `ELEVEN_LABS_API_KEY`
5. Pon el valor de tu API Key
6. Redeploy la aplicación

## Paso 3: Verificar la configuración

Para verificar que Eleven Labs está funcionando con plan pago:

```bash
curl -X POST http://localhost:3000/api/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "subPackageId": "video-1",
    "extraInfo": "Test de voz con Eleven Labs",
    "images": []
  }'
```

Deberías recibir audio generado automáticamente.

## Alternativas Gratuitas (sin plan pago)

Si no tienes plan pago, el sistema genera automáticamente:

### 1. Web Speech API
```javascript
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance("Tu texto aquí");
utterance.lang = "es-DO";
utterance.rate = 0.8;
synth.speak(utterance);
```

### 2. Google Translate
1. Ve a https://translate.google.com/
2. Pega el texto
3. Selecciona español → español
4. Haz clic en 🔊

### 3. Herramientas Gratuitas
- **Balabolka**: Software gratuito para PC
- **NaturalReader**: Versión gratuita limitada
- **TTSMP3.com**: Hasta 3000 caracteres gratis

## Funcionalidades implementadas

✅ Generación de guiones con IA (Gemini)
✅ Conversión de texto a voz con Eleven Labs (plan pago)
✅ Instrucciones automáticas para alternativas gratuitas
✅ Videos optimizados para reels (15-30 segundos)
✅ Estrategia de contenido personalizada
✅ Hashtags y CTAs optimizados
✅ Múltiples plataformas (Instagram, TikTok)

## Solución de problemas

### Error: "paid_plan_required"
- **Solución**: Actualiza a un plan pago de Eleven Labs
- **Temporal**: Usa las alternativas gratuitas proporcionadas

### Error: "missing_permissions"
- Verifica que tu API key tenga permisos para TTS

### Voz no natural
- Ajusta los parámetros de voz en la configuración
- Prueba diferentes voice IDs

## Costos aproximados

- **Plan gratuito**: ❌ No funciona con API
- **Plan Starter**: $5/mes = ~500 videos cortos
- **Plan Creator**: $22/mes = ~2000 videos cortos
- **Plan Pro**: $99/mes = ~10,000 videos cortos

**Recomendación**: Plan Creator para uso profesional.
    "subPackageId": "video-1",
    "extraInfo": "Test de voz con Eleven Labs",
    "images": []
  }'
```

Deberías recibir audio generado automáticamente.

## Alternativas Gratuitas (sin plan pago)

Si no tienes plan pago, el sistema genera automáticamente:

### 1. Web Speech API
```javascript
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance("Tu texto aquí");
utterance.lang = "es-DO";
utterance.rate = 0.8;
synth.speak(utterance);
```

### 2. Google Translate
1. Ve a https://translate.google.com/
2. Pega el texto
3. Selecciona español → español
4. Haz clic en 🔊

### 3. Herramientas Gratuitas
- **Balabolka**: Software gratuito para PC
- **NaturalReader**: Versión gratuita limitada
- **TTSMP3.com**: Hasta 3000 caracteres gratis

## Funcionalidades implementadas

✅ Generación de guiones con IA (Gemini)
✅ Conversión de texto a voz con Eleven Labs (plan pago)
✅ Instrucciones automáticas para alternativas gratuitas
✅ Videos optimizados para reels (15-30 segundos)
✅ Estrategia de contenido personalizada
✅ Hashtags y CTAs optimizados
✅ Múltiples plataformas (Instagram, TikTok)

## Solución de problemas

### Error: "paid_plan_required"
- **Solución**: Actualiza a un plan pago de Eleven Labs
- **Temporal**: Usa las alternativas gratuitas proporcionadas

### Error: "missing_permissions"
- Verifica que tu API key tenga permisos para TTS

### Voz no natural
- Ajusta los parámetros de voz en la configuración
- Prueba diferentes voice IDs

## Costos aproximados

- **Plan gratuito**: ❌ No funciona con API
- **Plan Starter**: $5/mes = ~500 videos cortos
- **Plan Creator**: $22/mes = ~2000 videos cortos
- **Plan Pro**: $99/mes = ~10,000 videos cortos

**Recomendación**: Plan Creator para uso profesional.

✅ Generación de guiones con IA (Gemini)
✅ Conversión de texto a voz con Eleven Labs
✅ Videos optimizados para reels (15-30 segundos)
✅ Estrategia de contenido personalizada
✅ Hashtags y CTAs optimizados
✅ Múltiples plataformas (Instagram, TikTok)

## Solución de problemas

### Error: "Eleven Labs API error: 401"
- Verifica que tu API Key sea correcta
- Asegúrate de que no tenga espacios extras

### Error: "Eleven Labs API error: 429"
- Has excedido el límite de la API gratuita
- Considera actualizar tu plan en Eleven Labs

### Error: "Voice not found"
- Verifica que el voiceId sea correcto
- Usa las constantes predefinidas en `ELEVEN_LABS_VOICES`

## Costos aproximados

- **Plan gratuito**: 10,000 caracteres por mes
- **Plan Starter**: $5/mes = 30,000 caracteres
- **Plan Creator**: $22/mes = 100,000 caracteres
- **Plan Pro**: $99/mes = 500,000 caracteres

Para producción, recomendamos el plan Creator o superior.