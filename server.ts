import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import Replicate from "replicate";
import archiver from "archiver";

// Import API handlers
import saveProjectHandler from "./api/save-project";
import getProjectsHandler from "./api/get-projects";
import generateMarketingHandler from "./api/generate-marketing";
import generateVideoHandler from "./api/generate-video";

// Load environment variables
dotenv.config();

// Cliente Groq como proveedor principal de texto
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Cliente Replicate para generación de imágenes
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

// Función helper para llamar a Groq con formato JSON
async function callGroqJson(prompt: string, maxTokens: number = 4000) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    });
    const content = completion.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    throw new Error('Empty response from Groq');
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies (with increased limit for images)
  app.use(express.json({ limit: '50mb' }));

  // API Routes will go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "DigiMarket RD Factory API is running" });
  });

  // Project persistence routes - wrapped for Express compatibility
  app.post("/api/save-project", async (req, res) => {
    try {
      await saveProjectHandler(req as any, res as any);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/get-projects", async (req, res) => {
    try {
      await getProjectsHandler(req as any, res as any);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Marketing routes
  app.post("/api/generate-marketing", async (req, res) => {
    try {
      await generateMarketingHandler(req as any, res as any);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Video routes
  app.post("/api/generate-video", async (req, res) => {
    // No wrap in try-catch to allow handler to manage its own error responses
    await generateVideoHandler(req as any, res as any);
  });

  app.post("/api/generate-branding", async (req, res) => {
    try {
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

      console.log(`Processing branding for ${clientName}, images: ${images?.length || 0}`);

      // Convert images to base64 parts if they exist
      const imageParts = (images || []).map((img: any) => {
        const imageString = typeof img === 'string' ? img : img?.url;
        if (!imageString || typeof imageString !== 'string') {
          throw new Error('Formato de imagen no válido');
        }
        const base64Data = imageString.includes(',') ? imageString.split(',')[1] : imageString;
        const mimeType = imageString.startsWith('data:') ? imageString.split(':')[1].split(';')[0] : 'image/jpeg';
        // Validate image size (max 4MB base64)
        if (base64Data.length > 4 * 1024 * 1024) {
          throw new Error('Imagen demasiado grande. Máximo 4MB por imagen.');
        }
        return {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      });

      console.log(`Converted ${imageParts.length} images for Replicate`);

      // Use Replicate for image-to-image or text-to-image if images are provided
      let brandingData;
      if (imageParts.length > 0) {
        // Generate using Replicate with image inputs
        // This is a simplified flow - adapt the model and parameters as needed
        brandingData = await generateBrandingWithImages({ clientName, extraInfo, features, imageParts });
      } else {
        brandingData = await generateBrandingWithoutImages({ clientName, extraInfo, features, name });
      }

      res.json({
        success: true,
        data: brandingData
      });

    } catch (error: any) {
      console.error("Error generating branding:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-branding-zip", async (req, res) => {
    try {
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

      // Convert images to base64 parts if they exist
      const imageParts = (images || []).map((img: any) => {
        const imageString = typeof img === 'string' ? img : img?.url;
        if (!imageString || typeof imageString !== 'string') {
          throw new Error('Formato de imagen no válido');
        }
        const base64Data = imageString.includes(',') ? imageString.split(',')[1] : imageString;
        const mimeType = imageString.startsWith('data:') ? imageString.split(':')[1].split(';')[0] : 'image/jpeg';
        return {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      });

      // Generate branding data with Groq (primary) and Replicate fallback
      const prompt = `
        Eres el Director Creativo de DigiMarket RD.
        Crea la identidad visual para el cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        PAQUETE SELECCIONADO: ${name}
        CARACTERÍSTICAS OBLIGATORIAS A ENTREGAR:
        ${features.map((f: string) => `- ${f}`).join('\n')}

        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia.
        Analiza estas imágenes para entender el estilo visual preferido del cliente.

        DEBES GENERAR UNA RESPUESTA JSON CON:
        1. "brandManual": Manual de marca en Markdown.
        2. "colorPalette": Array de objetos {hex, name, usage}.
        3. "typography": Array de objetos {name, usage}.
        4. "logoPrompts": Array de prompts detallados para generar logos.
        5. "code": Objeto con archivos necesarios (ej. {"manual.md": "...", "estilos.css": "..."}) que implementen TODAS las características obligatorias listadas arriba.
      `;

      let brandingData;
      const errors: string[] = [];

      // Intento 1: Groq
      if (process.env.GROQ_API_KEY) {
        try {
          const result = await callGroqJson(prompt);
          console.log('✅ Branding generado por Groq');
          brandingData = result;
        } catch (error: any) {
          const msg = `Groq: ${error.message || 'Unknown error'}`;
          console.warn(`❌ ${msg}`);
          errors.push(msg);
        }
      }

      // Intento 2: Replicate como fallback
      if (!brandingData && replicate) {
        try {
          // Adaptar prompt para Replicate si es necesario
          const replicatePrompt = prompt + '\n\nResponde solo con JSON válido.';
          // Ejemplo: usar modelo de Stable Diffusion u otro adecuado
          const output = await replicate.run("stability-ai/sdxl:latest", {
            input: { prompt: replicatePrompt }
          });
          // Procesar output según el formato esperado (ajustar según la API de Replicate)
          console.log('✅ Branding generado por Replicate (fallback)');
          // brandingData = processReplicateOutput(output); // Implementar según sea necesario
        } catch (error: any) {
          const msg = `Replicate: ${error.message || 'Unknown error'}`;
          console.warn(`❌ ${msg}`);
          errors.push(msg);
        }
      }

      if (!brandingData) {
        throw new Error(`Todos los proveedores fallaron:\n${errors.join('\n')}`);
      }

      // Generate logos via Replicate (example models)
      const generatedLogos: string[] = [];
      for (const logoPrompt of brandingData.logoPrompts || []) {
        let logoUrl: string | null = null;
        // Try HuggingFace if key exists (optional)
        if (process.env.HUGGINGFACE_API_KEY) {
          try {
            const hfResponse = await fetch(
              "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ inputs: logoPrompt })
              }
            );
            if (hfResponse.ok) {
              const arrayBuffer = await hfResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              logoUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            }
          } catch (e) {
            console.error("Error with HuggingFace:", e);
          }
        }

        // Fallback to Pollinations
        if (!logoUrl) {
          const encodedPrompt = encodeURIComponent(logoPrompt + " professional vector logo, white background, high quality");
          const seed = Math.floor(Math.random() * 100000);
          logoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
        }
        generatedLogos.push(logoUrl);
      }

      // Create ZIP
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${clientName}-branding.zip"`);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Add files to ZIP
      archive.append(brandingData.brandManual, { name: '01_MANUAL_DE_MARCA.md' });
      archive.append(JSON.stringify(brandingData.colorPalette, null, 2), { name: '02_PALETA_COLORES.json' });
      archive.append(JSON.stringify(brandingData.typography, null, 2), { name: '03_TIPOGRAFIAS.json' });
      archive.append(JSON.stringify(brandingData.logoPrompts, null, 2), { name: '04_LOGO_PROMPTS.json' });

      for (let i = 0; i < generatedLogos.length; i++) {
        const logoUrl = generatedLogos[i];
        if (logoUrl.startsWith('data:')) {
          const base64Data = logoUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          archive.append(buffer, { name: `05_LOGO_${i + 1}.png` });
        } else {
          try {
            const logoResponse = await fetch(logoUrl);
            const arrayBuffer = await logoResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            archive.append(buffer, { name: `05_LOGO_${i + 1}.png` });
          } catch (err) {
            console.warn(`Failed to fetch logo ${i + 1}:`, err);
          }
        }
      }

      const readme = `# Paquete de Branding para ${clientName}

## Estructura de archivos:
- 01_MANUAL_DE_MARCA.md - Manual completo de marca
- 02_PALETA_COLORES.json - Colores en formato HEX
- 03_TIPOGRAFIAS.json - Fuentes recomendadas
- 04_LOGO_PROMPTS.json - Prompts usados para generar los logos
- 05_LOGO_X.png - Archivos de logo en alta resolución

## Cómo usar:
1. Revisa el manual de marca para entender los lineamientos
2. Usa los archivos PNG para impresión y web
3. Los colores y tipografías están especificados en los JSON.

Generado por DigiMarket RD - ${new Date().toISOString().split('T')[0]}
`;
      archive.append(readme, { name: 'README.md' });

      await archive.finalize();

    } catch (error: any) {
      console.error("Error generating branding ZIP:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-web", async (req, res) => {
    try {
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

      const imageParts = (images || []).map((img: any) => {
        const imageString = typeof img === 'string' ? img : img?.url;
        if (!imageString || typeof imageString !== 'string') {
          throw new Error('Formato de imagen no válido');
        }
        const base64Data = imageString.includes(',') ? imageString.split(',')[1] : imageString;
        const mimeType = imageString.startsWith('data:') ? imageString.split(':')[1].split(';')[0] : 'image/jpeg';
        return {
          inlineData: {
            data: base64Data,
            mimeType
          }
        };
      });

      const prompt = `
        Eres el Director de Desarrollo Web de DigiMarket RD.
        Crea la estructura y el copy para la web del cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        PAQUETE SELECCIONADO: ${name}
        CARACTERÍSTICAS OBLIGATORIAS A ENTREGAR:
        ${features.map((f: string) => `- ${f}`).join('\n')}

        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia.
        Analiza estas imágenes para entender la marca, el estilo y el contenido.
        Úsalas para proponer un diseño coherente.

        DEBES GENERAR UNA RESPUESTA JSON CON:
        1. "sitemap": Array de páginas.
        2. "heroCopy": Objeto con {title, subtitle, cta}.
        3. "mockupPrompt": Prompt para generar mockup.
        4. "code": Objeto con archivos necesarios (ej. {"index.html": "...", "style.css": "...", "script.js": "..."}) que implementen TODAS las características obligatorias listadas arriba.
      `;

      let webData;
      try {
        const response = await callGroqJson(prompt);
        webData = response;
      } catch (error) {
        console.warn('Error with Groq, trying without images:', error);
        const simplifiedPrompt = prompt.replace(/, \d+ imágenes de referencia[^.]*/g, '') + '\n\nNo uses imágenes en la respuesta.';
        const response = await callGroqJson(simplifiedPrompt);
        webData = response;
      }

      // Generate mockup image via Replicate
      let mockupImage = '';
      if (replicate && webData.mockupPrompt) {
        try {
          const encodedPrompt = encodeURIComponent(webData.mockupPrompt + ' modern website UI UX design, high quality, dribbble');
          const seed = Math.floor(Math.random() * 100000);
          mockupImage = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1280&height=800&nologo=true`;
        } catch (e) {
          console.warn('Mockup generation skipped:', e);
        }
      }

      res.json({ success: true, data: { ...webData, mockupImage } });
    } catch (error: any) {
      console.error("Error generating web:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/image", async (req, res) => {
    try {
      const { prompt, quality } = req.body;
      const model = quality === 'high' ? "FLUX.1-schnell" : "FLUX.1-dev";

      if (!replicate) {
        return res.status(500).json({ success: false, error: "Replicate not configured" });
      }

      const output = await replicate.run(model, { input: { prompt } });
      // output is expected to be an image URL or base64
      let imageUrl = output;
      if (typeof output === 'object' && output.output) imageUrl = output.output;

      res.json({ success: true, data: imageUrl });
    } catch (error: any) {
      console.error("Error generating AI image:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/video", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      // Use Replicate for video generation; model names vary by provider
      if (!replicate) {
        return res.status(500).json({ success: false, error: "Replicate not configured" });
      }
      const output = await replicate.run("stability-ai/sdxl:latest", { input: { prompt } });
      res.json({ success: true, data: output });
    } catch (error: any) {
      console.error("Error generating video:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, complexity } = req.body;
      let model = "llama-3.3-70b-versatile";
      if (complexity === 'high') model = "llama-3.1-70b-versatile";
      if (complexity === 'fast') model = "llama-3.1-8b-instant";
      const response = await callGroqJson(prompt, 2000);
      res.json({ success: true, data: response.text || response.content || '' });
    } catch (error: any) {
      console.error("Error generating chat:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();