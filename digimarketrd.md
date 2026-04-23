# Documentación del Proyecto DigiMarket RD

## ✅ Tareas Realizadas

### 1. Actualización de Firebase
- **Fecha:** 2026-04-20
- **Acción:** Migración de configuración desde archivo JSON a variables de entorno
- **Archivos modificados:**
  - `src/firebase.ts`: Ahora usa `import.meta.env.VITE_FIREBASE_*` en lugar de importar desde JSON
- **Beneficios:** Mayor seguridad, mantieneabilidad y compatibilidad con Vite

### 2. Configuración de Replicate Webhook
- **Fecha:** 2026-04-20  
- **Acción:** Implementación de endpoint para recibir notificaciones automáticas de Replicate
- **Archivos modificados:**
  - `server.ts`: Añadido endpoint `/api/webhook/replicate`
  - Instalado dependencia: `npm install @replicate/webhooks`
- **Funcionalidad:** Guarda eventos en colección `replicate_events` de Firestore

### 3. Variables de Entorno Requeridas
- **VITE_GEMINI_API_KEY**: Clave API para Gemini (generación de contenido)
- **REPLICATE_API_TOKEN**: Token para API de Replicate (videos e imágenes)
- **FIREBASE_***: Configuración de Firebase Admin SDK
- **VITE_FIREBASE_***: Configuración Firebase para frontend
- **ELEVEN_LABS_API_KEY**: Para texto-a-voz (opcional)

### 4. Fix: Imágenes de referencia ahora se analizan con Gemini Vision
- **Fecha:** 2026-04-20
- **Problema:** `analyzeBrandImages` no enviaba las imágenes a Gemini, solo generaba texto genérico.
- **Archivos modificados:**
  - `api/lib/ai.ts`: Función reescrita para enviar imágenes como `inlineData` a Gemini 1.5 Flash y extraer colores, estilo y energía de marca.
  - `api/generate.ts`: Ahora llama `analyzeBrandImages` con las imágenes del request **antes** de construir el prompt, e inyecta el análisis en `brandEnforcement`.

### 5. Fix: Reintentos automáticos en generación de imágenes
- **Fecha:** 2026-04-20
- **Problema:** Si Replicate fallaba, el proceso terminaba sin reintentar.
- **Archivos modificados:**
  - `api/generate-asset.ts`: Agregada función `generateImageWithRetry` con backoff exponencial (1s, 2s, 4s). Máximo 3 intentos.

---

## 📋 Checklist
- [x] Firebase cliente migrado a variables de entorno
- [x] Replicate webhook implementado y guarda en Firestore
- [x] Imágenes de referencia analizadas con Gemini Vision
- [x] Prompts incluyen análisis visual real del cliente
- [x] Reintentos automáticos en generación de imágenes
- [ ] Validación exacta de cantidades por paquete (pendiente)
- [x] Deploy final a Vercel

---

## 📋 Checklist Rápido
- [ ] Firebase configurado y funcionando
- [ ] Replicate webhook implementado
- [ ] Variables de entorno listas
- [ ] Tests de integración



- [ ] Despliegue finalguarda el md