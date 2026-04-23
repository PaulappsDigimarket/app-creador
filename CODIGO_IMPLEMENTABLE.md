# 💻 EJEMPLOS DE CÓDIGO - DigiMarket RD Optimización

**Código listo para copiar y pegar**  
Implementación rápida de las 6 optimizaciones

---

## 1️⃣ AUTO-SAVE EN /api/generate

### ANTES (Actual)

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { type, clientName, extraInfo = '', images = [], packageDetails } = req.body;

    // ... código de generación ...
    
    const data = await generateStructured<any>(prompt, schema, { temperature: 0.8, maxTokens: 8000 });

    return res.json({ success: true, type, data });
  } catch (error: any) {
    return errorResponse(res, error);
  }
}
```

### DESPUÉS (Con Auto-save)

```typescript
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { 
      type, 
      clientName, 
      extraInfo = '', 
      images = [], 
      packageDetails,
      subPackageId 
    } = req.body;

    if (!type || !clientName) {
      return res.status(400).json({ success: false, error: 'type and clientName are required' });
    }

    // ... código de generación existente ...
    const data = await generateStructured<any>(prompt, schema, { temperature: 0.8, maxTokens: 8000 });

    // ✅ NUEVO: Auto-save en Supabase
    const projectData = {
      user_id: 'admin', // O el ID del usuario autenticado
      client_name: clientName,
      project_name: req.body.projectName || `Proyecto ${clientName}`,
      extra_info: extraInfo,
      category: type,
      package_id: subPackageId,
      data: data, // JSON del resultado
      status: 'in_progress', // Porque aún faltan imágenes
      created_at: new Date().toISOString()
    };

    const { data: savedProject, error: saveError } = await supabase
      .from('projects')
      .insert([projectData])
      .select('id');

    if (saveError) {
      console.error('Error saving project:', saveError);
      // No fallar, solo loguear (el proyecto se puede guardar después)
    }

    const projectId = savedProject?.[0]?.id;

    // ✅ Retornar con projectId para que el frontend lo guarde
    return res.json({ 
      success: true, 
      type, 
      projectId, // IMPORTANTE para tracking
      data 
    });

  } catch (error: any) {
    return errorResponse(res, error);
  }
}
```

### Cambios en Frontend (src/App.tsx)

```typescript
// En generateFinalResult:
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type,
    clientName,
    projectName,
    subPackageId: selectedSubPackage?.id,
    packageDetails: selectedSubPackage,
    extraInfo,
    images
  })
});

const payload = await response.json();

// ✅ NUEVO: El projectId viene en la respuesta
if (payload.projectId) {
  setCurrentProjectId(payload.projectId);
  // El proyecto ya se guardó automáticamente
  setChatMessages(prev => [...prev, { 
    role: 'model', 
    text: '✅ Proyecto guardado automáticamente en la base de datos' 
  }]);
}

setResult(payload.data);
```

---

## 2️⃣ UNIFICAR BASES DE DATOS (Firebase → Supabase)

### CREAR TABLA EN SUPABASE

```sql
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL DEFAULT 'admin',
  client_name VARCHAR NOT NULL,
  project_name VARCHAR,
  extra_info TEXT,
  category VARCHAR NOT NULL,
  package_id VARCHAR,
  data JSONB NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_status ON projects(status);

-- RLS (Row Level Security) - Opcional pero recomendado
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage projects" 
  ON projects 
  FOR ALL 
  USING (user_id = 'admin');
```

### Actualizar save-project.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const {
      userId = 'admin',
      clientName,
      projectName,
      extraInfo = "",
      branding = null,
      web = null,
      social = null,
      app = null,
      video = null,
      projectId // Para actualizar proyectos existentes
    } = req.body || {};

    if (!clientName) {
      return res.status(400).json({
        success: false,
        error: "clientName is required"
      });
    }

    const now = new Date().toISOString();

    const projectData = {
      user_id: userId,
      client_name: clientName,
      project_name: projectName || `Proyecto ${clientName}`,
      extra_info: extraInfo,
      data: {
        branding,
        web,
        social,
        app,
        video
      },
      status: "completed",
      updated_at: now
    };

    let finalId;

    if (projectId) {
      // Actualizar proyecto existente
      const { data, error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", projectId)
        .select('id');

      if (error) throw error;
      finalId = projectId;
    } else {
      // Crear nuevo proyecto
      const { data, error } = await supabase
        .from("projects")
        .insert([{
          ...projectData,
          created_at: now
        }])
        .select('id');

      if (error) throw error;
      finalId = data?.[0]?.id;
    }

    return res.status(200).json({
      success: true,
      projectId: finalId,
      message: projectId ? "Proyecto actualizado correctamente" : "Proyecto guardado correctamente"
    });

  } catch (error: any) {
    console.error("Error saving project:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error al guardar proyecto"
    });
  }
}
```

### Actualizar get-projects.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedProjects = (projects || []).map((project: any) => ({
      id: project.id,
      clientName: project.client_name,
      projectName: project.project_name,
      extraInfo: project.extra_info,
      category: project.category,
      branding: project.data?.branding || null,
      web: project.data?.web || null,
      social: project.data?.social || null,
      app: project.data?.app || null,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      status: project.status
    }));

    return res.json({
      success: true,
      projects: formattedProjects,
      total: formattedProjects.length
    });

  } catch (error: any) {
    console.error('Error getting projects:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'No se pudieron cargar los proyectos',
      projects: [],
      total: 0
    });
  }
}
```

---

## 3️⃣ QUEUE SYSTEM PARA IMÁGENES

### Instalar dependencia

```bash
npm install p-queue
```

### Actualizar generate-asset.ts

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import PQueue from 'p-queue';
import { generateImage, triggerVideoGeneration, errorResponse } from './lib/ai.js';

// Crear queue global (máximo 3 imágenes en paralelo)
const imageQueue = new PQueue({
  concurrency: 3, // ✅ IMPORTANTE: Solo 3 imágenes simultáneas
  interval: 1000, // Ventana de tiempo
  intervalCap: 3  // Máximo requests en la ventana
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { type, prompt } = req.body;

    if (!type || !prompt) {
      return res.status(400).json({ success: false, error: 'type and prompt are required' });
    }

    if (type === 'image') {
      // ✅ Usar queue en lugar de directo
      const url = await imageQueue.add(() =>
        generateImageWithRetry(prompt, 3)
      );
      return res.json({ success: true, url });
    }

    if (type === 'video') {
      const pollUrl = await triggerVideoGeneration(prompt);
      return res.json({ success: true, pollUrl });
    }

    return res.status(400).json({ success: false, error: 'Invalid asset type' });

  } catch (error: any) {
    return errorResponse(res, error);
  }
}

// ✅ Función con reintentos automáticos
async function generateImageWithRetry(
  prompt: string,
  maxRetries: number = 3,
  retryCount: number = 0
): Promise<string> {
  try {
    console.log(`[Image] Generating: ${prompt.substring(0, 50)}...`);
    return await generateImage(prompt);
  } catch (error) {
    if (retryCount < maxRetries) {
      const waitTime = 1000 * Math.pow(2, retryCount); // Backoff exponencial
      console.warn(`[Image] Failed (attempt ${retryCount + 1}/${maxRetries}). Retrying in ${waitTime}ms...`);
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reintentar recursivamente
      return generateImageWithRetry(prompt, maxRetries, retryCount + 1);
    } else {
      console.error(`[Image] Failed after ${maxRetries} retries:`, error);
      throw new Error(`No se pudo generar imagen después de ${maxRetries} intentos: ${(error as any).message}`);
    }
  }
}
```

### Actualizar Frontend para mostrar progreso

```typescript
// En src/App.tsx, función para generar assets:

const generateAssets = async (data: any) => {
  let completed = 0;
  const total = (data.posts?.length || 0) + (data.stories?.length || 0) + (data.reels?.length || 0);

  // Imágenes
  if (data.posts) {
    for (const [idx, post] of data.posts.entries()) {
      try {
        const res = await fetch('/api/generate-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', prompt: post.imagePrompt || post.copy })
        });
        const asset = await res.json();
        
        if (asset.success) {
          setResult((prev: any) => {
            const next = { ...prev };
            next.posts[idx].imageUrl = asset.url;
            return next;
          });

          // ✅ NUEVO: Mostrar progreso
          completed++;
          setChatMessages(prev => [...prev, {
            role: 'model',
            text: `✅ Imagen ${completed}/${total} generada`
          }]);
        }
      } catch (e) {
        console.error(`Error generando post ${idx}:`, e);
        setChatMessages(prev => [...prev, {
          role: 'model',
          text: `❌ Error generando imagen ${idx + 1}. Reintentando...`
        }]);
      }
    }
  }

  // Similar para stories, reels, etc...
};
```

---

## 4️⃣ WEBHOOKS PARA VIDEOS (Replicate)

### En server.ts - Agregar endpoint webhook

```typescript
import express from "express";

const app = express();

// ... código existente ...

// ✅ NUEVO: Endpoint para webhooks de Replicate
app.post("/api/webhook/replicate", async (req, res) => {
  try {
    const { id, status, output } = req.body;

    console.log(`[Webhook] Replicate prediction ${id} finished with status: ${status}`);

    if (status === 'succeeded' && output) {
      // 1. Guardar URL del video en la base de datos
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        // Actualizar la tabla de videos
        // (asumiendo que guardaste el replicate_id en la DB)
        await supabase
          .from('videos')
          .update({ url: output, status: 'completed' })
          .eq('replicate_id', id);
      }

      // 2. Notificar al frontend vía WebSocket (si tienes Socket.io)
      // io.emit('video_ready', { videoId: id, url: output });
      console.log(`[Webhook] Video completado: ${output}`);
    } else if (status === 'failed') {
      console.error(`[Webhook] Prediction ${id} failed`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// ... resto del código ...
```

### En generate-asset.ts - Usar webhooks

```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... código anterior ...

  if (type === 'video') {
    try {
      const prediction = await replicate.predictions.create({
        version: '...',  // Version ID de Luma/Veo
        input: {
          prompt: prompt,
          duration: 5 // segundos
        },
        // ✅ NUEVO: Configurar webhook
        webhook: `${process.env.VERCEL_URL || 'https://app-creador.vercel.app'}/api/webhook/replicate`,
        webhook_events_filter: ['completed']
      });

      // Guardar en base de datos para tracking
      if (process.env.SUPABASE_URL) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_KEY
        );

        await supabase.from('videos').insert({
          replicate_id: prediction.id,
          status: 'processing',
          prompt: prompt,
          created_at: new Date().toISOString()
        });
      }

      // ✅ No esperar a que se complete, retornar prediction URL
      return res.json({
        success: true,
        pollUrl: prediction.urls.get, // O usar webhooks
        predictionId: prediction.id
      });

    } catch (error: any) {
      return errorResponse(res, error);
    }
  }
}
```

---

## 5️⃣ SISTEMA DE CACHÉ

### Crear tabla en Supabase

```sql
CREATE TABLE IF NOT EXISTS content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR UNIQUE NOT NULL,
  content_type VARCHAR NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  ttl_days INTEGER DEFAULT 30,
  hit_count INTEGER DEFAULT 1
);

CREATE INDEX idx_cache_key ON content_cache(cache_key);
CREATE INDEX idx_cache_created_at ON content_cache(created_at);
```

### Funciones de caché

```typescript
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Generar clave de caché basada en parámetros
function generateCacheKey(clientName: string, type: string, packageId: string, extraInfo: string): string {
  const input = `${clientName}|${type}|${packageId}|${extraInfo}`;
  return crypto.createHash('md5').update(input).digest('hex');
}

// Obtener del caché
async function getFromCache(cacheKey: string) {
  try {
    const { data, error } = await supabase
      .from('content_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    // Verificar si aún es válido (TTL)
    const createdDate = new Date(data.created_at);
    const expiryDate = new Date(createdDate.getTime() + data.ttl_days * 24 * 60 * 60 * 1000);

    if (new Date() > expiryDate) {
      // Caché expirado, eliminarlo
      await supabase.from('content_cache').delete().eq('id', data.id);
      return null;
    }

    // Incrementar hit count
    await supabase
      .from('content_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('id', data.id);

    return data.data;
  } catch (error) {
    console.warn('Cache retrieval failed:', error);
    return null;
  }
}

// Guardar en caché
async function saveToCache(cacheKey: string, contentType: string, data: any, ttlDays: number = 30) {
  try {
    await supabase.from('content_cache').insert({
      cache_key: cacheKey,
      content_type: contentType,
      data: data,
      ttl_days: ttlDays
    });
  } catch (error) {
    console.warn('Cache save failed:', error);
  }
}

export { generateCacheKey, getFromCache, saveToCache };
```

### Usar caché en generate.ts

```typescript
import { generateCacheKey, getFromCache, saveToCache } from './lib/cache.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { type, clientName, extraInfo = '', packageDetails } = req.body;

    // ✅ Generar clave de caché
    const cacheKey = generateCacheKey(
      clientName,
      type,
      packageDetails?.id || '',
      extraInfo
    );

    // ✅ Intentar obtener del caché
    const cachedData = await getFromCache(cacheKey);
    if (cachedData) {
      console.log(`[Cache] Hit para ${clientName} (${type})`);
      return res.json({
        success: true,
        type,
        data: cachedData,
        cached: true // Indicar al frontend que es caché
      });
    }

    // Si no está en caché, generar
    console.log(`[Cache] Miss para ${clientName} (${type}), generando...`);
    const data = await generateStructured<any>(prompt, schema, { temperature: 0.8, maxTokens: 8000 });

    // ✅ Guardar en caché
    await saveToCache(cacheKey, type, data, 30); // TTL de 30 días

    return res.json({ success: true, type, data, cached: false });

  } catch (error: any) {
    return errorResponse(res, error);
  }
}
```

---

## 6️⃣ MANEJO DE ERRORES ROBUSTO

### Crear tabla de errores

```sql
CREATE TABLE IF NOT EXISTS generation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  component VARCHAR NOT NULL,
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_errors_project_id ON generation_errors(project_id);
CREATE INDEX idx_errors_unresolved ON generation_errors(resolved);
```

### Servicio de manejo de errores

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

interface ErrorLog {
  projectId: string;
  component: string;
  error: any;
  context?: any;
}

async function logError(errorLog: ErrorLog) {
  try {
    const { projectId, component, error, context } = errorLog;

    const { data, error: dbError } = await supabase
      .from('generation_errors')
      .insert({
        project_id: projectId,
        component: component,
        error_message: error.message,
        error_details: {
          stack: error.stack,
          context: context
        }
      })
      .select('id');

    if (dbError) console.error('Error logging failed:', dbError);
    return data?.[0]?.id;
  } catch (err) {
    console.error('Unexpected error in logError:', err);
  }
}

async function retryWithBackoff(
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error; // Último intento fallido
      }

      const delay = baseDelay * Math.pow(2, attempt); // Backoff exponencial
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`,
        (error as any).message
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export { logError, retryWithBackoff };
```

### Usar en tu código

```typescript
import { logError, retryWithBackoff } from './lib/errorHandler.js';

// Ejemplo en generate-asset.ts:
try {
  const imageUrl = await retryWithBackoff(
    () => generateImage(prompt),
    3,      // maxRetries
    1000    // baseDelay
  );
  return res.json({ success: true, url: imageUrl });
} catch (error) {
  // Loguear el error
  await logError({
    projectId: req.body.projectId,
    component: 'generate-asset',
    error: error,
    context: { type: 'image', prompt: prompt.substring(0, 100) }
  });

  return errorResponse(res, error);
}
```

---

## 🎁 BONUS: Variables de Entorno Completas

Crea un archivo `.env.production` con esto:

```env
# === APIS PRINCIPALES ===
GEMINI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# === IMÁGENES ===
HUGGINGFACE_API_KEY=hf_...
# Si no tienes HF, Pollinations es gratuito (no requiere key)

# === VIDEOS ===
REPLICATE_API_TOKEN=r8_...

# === BASES DE DATOS ===
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...

FIREBASE_PROJECT_ID=project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# === TEXT-TO-SPEECH ===
ELEVEN_LABS_API_KEY=sk_...

# === ENTORNO ===
NODE_ENV=production
VERCEL_URL=https://app-creador.vercel.app
VITE_API_URL=https://app-creador.vercel.app
```

---

## ✅ Checklist de Implementación

- [ ] Copié el código de Auto-save
- [ ] Creé la tabla en Supabase
- [ ] Actualicé generate.ts
- [ ] Actualicé save-project.ts
- [ ] Actualicé get-projects.ts
- [ ] Instalé p-queue (`npm install p-queue`)
- [ ] Configuré Queue System
- [ ] Agregué webhook endpoint en server.ts
- [ ] Creé tabla de caché en Supabase
- [ ] Implementé funciones de caché
- [ ] Configuré manejo de errores
- [ ] Testé todo en local
- [ ] Hice deploy a staging
- [ ] Validé en producción

---

## 🚀 Próximos Pasos

1. Copia este código
2. Adapta a tu estructura
3. Testea en local
4. Haz deploy a staging
5. Validar en producción

**¡Listo! Tu sistema estará 10x mejor.**
