import Replicate from "replicate";
import { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from "groq-sdk";
import OpenAI from "openai"; // Necesitás: npm install openai

// Cliente OpenRouter (usa SDK de OpenAI con baseURL custom)
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": "https://digimarket-rd.com",
    "X-Title": "DigiMarket RD Branding"
  }
});

// Cliente Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

interface BrandingData {
  brandManual: string;
  colorPalette: Array<{ hex: string; name: string; usage: string }>;
  typography: Array<{ name: string; usage: string }>;
  logoPrompts: string[];
}

/**
 * Genera branding con fallback de proveedores de texto
 */
async function generateBrandingText(
  clientName: string, 
  extraInfo: string, 
  numLogos: number
): Promise<BrandingData> {
  
  const prompt = `
    Eres el Director Creativo de DigiMarket RD.
    Crea la identidad visual para el cliente: "${clientName}".
    Información adicional: "${extraInfo}".
    
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
      ]
    }
    
    Genera exactamente ${numLogos} prompts en logoPrompts.
    Responde SOLO con el JSON válido, sin explicaciones ni markdown.
  `;

  const errors: string[] = [];

  // Intento 1: Groq (tu proveedor actual, rápido y barato)
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = completion.choices[0].message.content;
    if (content) {
      console.log('✅ Branding generado por Groq');
      return JSON.parse(content);
    }
  } catch (error: any) {
    const msg = `Groq: ${error.message || 'Unknown error'}`;
    console.warn(`❌ ${msg}`);
    errors.push(msg);
  }

  // Intento 2: OpenRouter (Claude 3.5 Sonnet o GPT-4o-mini)
  try {
    const completion = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = completion.choices[0].message.content;
    if (content) {
      console.log('✅ Branding generado por OpenRouter (fallback)');
      return JSON.parse(content);
    }
  } catch (error: any) {
    const msg = `OpenRouter: ${error.message || 'Unknown error'}`;
    console.warn(`❌ ${msg}`);
    errors.push(msg);
  }

  // Intento 3: Gemini directo (si tenés API key de Gemini para este servicio)
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // Limpiar posible markdown de Gemini
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('✅ Branding generado por Gemini (fallback)');
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error: any) {
      const msg = `Gemini: ${error.message || 'Unknown error'}`;
      console.warn(`❌ ${msg}`);
      errors.push(msg);
    }
  }

  throw new Error(`Todos los proveedores de IA fallaron:\n${errors.join('\n')}`);
}

/**
 * Genera un logo con fallback de proveedores de imagen
 */
async function generateLogo(logoPrompt: string): Promise<string> {
  const enhancedPrompt = `${logoPrompt} vector logo, minimalist, flat design, white background`;
  
  // Intento 1: Replicate (FLUX Schnell)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt: enhancedPrompt }
      }) as any[];

      if (output && output[0]) {
        const reader = output[0].getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const buffer = Buffer.concat(chunks);
        console.log('✅ Logo generado por Replicate');
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch (e: any) {
      console.warn("Replicate failed:", e.message);
    }
  }

  // Intento 2: HuggingFace (FLUX Schnell)
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
        const buffer = Buffer.from(await hfResponse.arrayBuffer());
        console.log('✅ Logo generado por HuggingFace');
        return `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } else {
        console.warn(`HuggingFace HTTP ${hfResponse.status}`);
      }
    } catch (e: any) {
      console.warn("HuggingFace failed:", e.message);
    }
  }

  // Intento 3: Pollinations (siempre funciona, no requiere API key)
  const encodedPrompt = encodeURIComponent(enhancedPrompt + " professional vector logo, white background, high quality");
  const seed = Math.floor(Math.random() * 100000);
  console.log('✅ Logo generado por Pollinations (fallback gratuito)');
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clientName, subPackageId, extraInfo } = req.body;

    let numLogos = 3;
    if (subPackageId === 'branding-2') numLogos = 4;
    if (subPackageId === 'branding-3') numLogos = 5;
    if (subPackageId === 'branding-4') numLogos = 1;

    // Generar branding con fallback de texto
    const brandingData = await generateBrandingText(clientName, extraInfo, numLogos);

    // Validar que tenemos los prompts necesarios
    if (!brandingData.logoPrompts || !Array.isArray(brandingData.logoPrompts)) {
      throw new Error('La respuesta de IA no contiene logoPrompts válidos');
    }

    // Generar logos en paralelo con fallback de imágenes
    const generatedLogos = await Promise.all(
      brandingData.logoPrompts.map(async (prompt: string, index: number) => {
        try {
          return await generateLogo(prompt);
        } catch (error: any) {
          console.error(`Error generando logo ${index + 1}:`, error);
          // Último recurso: Pollinations directo
          const encodedPrompt = encodeURIComponent(`${prompt} logo`);
          const seed = Math.floor(Math.random() * 100000);
          return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
        }
      })
    );

    res.json({
      success: true,
      data: {
        ...brandingData,
        generatedLogos
      }
    });

  } catch (error: any) {
    console.error("Error generating branding:", error);
    
    // Respuesta estructurada para el frontend manejar
    res.status(503).json({ 
      success: false, 
      error: 'Servicios de IA temporalmente no disponibles',
      details: error.message,
      suggestion: 'Por favor intenta de nuevo en 30 segundos. Si el problema persiste, contacta soporte.'
    });
  }
}