import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import archiver from "archiver";

// Import API handlers
import saveProjectHandler from "./api/save-project";
import getProjectsHandler from "./api/get-projects";
import generateMarketingHandler from "./api/generate-marketing";
import generateVideoHandler from "./api/generate-video";

// Load environment variables
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        try {
          const base64Data = img.split(',')[1] || img;
          // Validar que la imagen no sea demasiado grande (máximo 4MB de base64)
          if (base64Data.length > 4 * 1024 * 1024) {
            throw new Error('Imagen demasiado grande. Máximo 4MB por imagen.');
          }
          return {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          };
        } catch (error) {
          console.error('Error processing image:', error);
          throw new Error(`Error procesando imagen: ${error.message}`);
        }
      });

      console.log(`Converted ${imageParts.length} images for Gemini`);

      // Función auxiliar para generar branding sin imágenes si hay problemas
      const generateBrandingWithoutImages = async () => {
        console.log('Generating branding without images due to size limits');
        const simplePrompt = `
          Eres el Director Creativo de DigiMarket RD.
          Crea la identidad visual para el cliente: "${clientName}".
          Información adicional: "${extraInfo}".

          IMPORTANTE: El cliente ha subido imágenes de referencia, pero debido a limitaciones técnicas, generarás la identidad basada en la descripción textual.

          Debes generar un JSON con exactamente esta estructura:
          {
            "brandManual": "Manual de marca en Markdown (Misión, Visión, Tono de voz, Reglas de uso)",
            "colorPalette": [
              { "hex": "#FF0000", "name": "Nombre del color", "usage": "Principal" }
            ],
            "typography": [
              { "name": "Nombre fuente", "usage": "Principal o Secundaria" }
            ],
            "logoPrompts": [
              "prompt en inglés para generar logo, vector logo, minimalist, flat design, white background"
            ],
            "code": {
              "manual.md": "Contenido del manual",
              "estilos.css": "CSS con variables de color"
            }
          }

          Genera exactamente 3 prompts en logoPrompts.
          Responde SOLO con el JSON, sin explicaciones ni markdown.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: 'user', parts: [{ text: simplePrompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brandManual: { type: Type.STRING },
                colorPalette: { type: Type.ARRAY, items: { type: Type.OBJECT } },
                typography: { type: Type.ARRAY, items: { type: Type.OBJECT } },
                logoPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
                code: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
              },
              required: ["brandManual", "colorPalette", "typography", "logoPrompts", "code"]
            }
          }
        });

        return JSON.parse(response.text || "{}");
      };

      // 1. Use Gemini to generate the Brand Strategy and Logo Prompts
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
        5. "code": Objeto con los archivos necesarios (ej. {"manual.md": "...", "estilos.css": "..."}) que implementen TODAS las características obligatorias listadas arriba.
      `;

      let brandingData;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                ...imageParts
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brandManual: { type: Type.STRING, description: "Manual de marca en Markdown" },
                colorPalette: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      hex: { type: Type.STRING, description: "Código HEX (ej. #FF0000)" },
                      name: { type: Type.STRING, description: "Nombre del color" },
                      usage: { type: Type.STRING, description: "Uso (ej. Principal, Fondo, Acento)" }
                    },
                    required: ["hex", "name", "usage"]
                  }
                },
                typography: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      usage: { type: Type.STRING }
                    },
                    required: ["name", "usage"]
                  }
                },
                logoPrompts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Prompts en inglés para generar logos"
                },
                code: {
                  type: Type.OBJECT,
                  additionalProperties: { type: Type.STRING },
                  description: "Mapa de archivos: nombre del archivo -> contenido del código"
                }
              },
              required: ["brandManual", "colorPalette", "typography", "logoPrompts", "code"]
            }
          }
        });

        const resultText = response.text || "{}";
        console.log(`Gemini response received, length: ${resultText.length}`);
        brandingData = JSON.parse(resultText);
      } catch (error) {
        console.warn('Error with images, trying without images:', error);
        brandingData = await generateBrandingWithoutImages();
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

  // NEW: Generate branding with downloadable ZIP
  app.post("/api/generate-branding-zip", async (req, res) => {
    try {
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        const base64Data = img.split(',')[1] || img;
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        };
      });

      // Generate branding data with Gemini
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
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brandManual: { type: Type.STRING },
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hex: { type: Type.STRING },
                    name: { type: Type.STRING },
                    usage: { type: Type.STRING }
                  },
                  required: ["hex", "name", "usage"]
                }
              },
              typography: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    usage: { type: Type.STRING }
                  },
                  required: ["name", "usage"]
                }
              },
              logoPrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["brandManual", "colorPalette", "typography", "logoPrompts"]
          }
        }
      });

      const brandingData = JSON.parse(response.text || "{}");

      // Generate logos (first try HuggingFace if key exists, else Pollinations)
      const generatedLogos: string[] = [];
      for (const logoPrompt of brandingData.logoPrompts) {
        let logoUrl: string | null = null;

        // Try HuggingFace FLUX if configured
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
              const base64 = buffer.toString('base64');
              logoUrl = `data:image/jpeg;base64,${base64}`;
            } else {
              console.warn("HuggingFace failed, falling back to Pollinations");
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

      // Download and add logos
      for (let i = 0; i < generatedLogos.length; i++) {
        const logoUrl = generatedLogos[i];
        if (logoUrl.startsWith('data:')) {
          // Base64: extract base64 part
          const base64Data = logoUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          archive.append(buffer, { name: `05_LOGO_${i + 1}.png` });
        } else {
          // External URL: fetch
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

      // Add README
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

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        const base64Data = img.split(',')[1] || img;
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
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
        4. "code": Objeto con los archivos necesarios (ej. {"index.html": "...", "style.css": "...", "script.js": "..."}) que implementen TODAS las características obligatorias listadas arriba.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sitemap: { type: Type.ARRAY, items: { type: Type.STRING } },
              heroCopy: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  cta: { type: Type.STRING }
                },
                required: ["title", "subtitle", "cta"]
              },
              mockupPrompt: { type: Type.STRING },
              code: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING },
                description: "Mapa de archivos: nombre del archivo -> contenido del código"
              }
            },
            required: ["sitemap", "heroCopy", "mockupPrompt", "code"]
          }
        }
      });

      const webData = JSON.parse(response.text || "{}");

      // Generate Mockup
      const encodedPrompt = encodeURIComponent(webData.mockupPrompt + " modern website UI UX design, high quality, dribbble, behance");
      const seed = Math.floor(Math.random() * 100000);
      const mockupImage = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1280&height=800&nologo=true`;

      res.json({ success: true, data: { ...webData, mockupImage } });
    } catch (error: any) {
      console.error("Error generating web:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/image", async (req, res) => {
    try {
      const { prompt, quality } = req.body;
      const model = quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
      
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/video", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      const response = await ai.models.generateContent({
        model: 'veo-3.1-fast-generate-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, complexity } = req.body;
      let model = 'gemini-3-flash-preview';
      if (complexity === 'high') model = 'gemini-3.1-pro-preview';
      if (complexity === 'fast') model = 'gemini-3.1-flash-lite-preview';
      
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
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
