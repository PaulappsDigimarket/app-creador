import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, subPackageId, extraInfo, images } = req.body;

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

    // Determine number of logo proposals based on package
    let numLogos = 3;
    if (subPackageId === 'branding-2') numLogos = 4;
    if (subPackageId === 'branding-3') numLogos = 5;
    if (subPackageId === 'branding-4') numLogos = 1;

    // 1. Use Gemini to generate the Brand Strategy and Logo Prompts
    const prompt = `
      Eres el Director Creativo de DigiMarket RD.
      Crea la identidad visual para el cliente: "${clientName}".
      Información adicional: "${extraInfo}".
      
      IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
      Analiza estas imágenes para entender el estilo visual preferido del cliente.
      
      Debes generar:
      1. Un manual de marca en formato Markdown (Misión, Visión, Tono de voz, Reglas de uso).
      2. Una paleta de colores (3 a 5 colores) con sus códigos HEX.
      3. Tipografías recomendadas (Principal y Secundaria).
      4. Exactamente ${numLogos} prompts detallados en INGLÉS para generar los logos en una IA de imágenes. Los prompts deben ser descriptivos, profesionales, indicando "vector logo, minimalist, flat design, white background" para asegurar buenos resultados.
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
              description: `Exactamente ${numLogos} prompts en inglés para generar logos`
            }
          },
          required: ["brandManual", "colorPalette", "typography", "logoPrompts"]
        }
      }
    });

    const resultText = response.text || "{}";
    const brandingData = JSON.parse(resultText);

    // 2. Generate Logos using Pollinations.ai (Free, No API Key needed) as fallback, 
    // or HuggingFace if API key is provided.
    const generatedLogos = [];
    for (let i = 0; i < brandingData.logoPrompts.length; i++) {
      const logoPrompt = brandingData.logoPrompts[i];
      
      if (process.env.HUGGINGFACE_API_KEY) {
        try {
          // Using Hugging Face FLUX.1-schnell
          const hfResponse = await fetch(
            "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
            {
              headers: {
                Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({ inputs: logoPrompt }),
            }
          );
          
          if (hfResponse.ok) {
            const arrayBuffer = await hfResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            generatedLogos.push(`data:image/jpeg;base64,${base64}`);
            continue; // Skip pollinations if HF succeeds
          } else {
            console.warn("HuggingFace failed, falling back to Pollinations");
          }
        } catch (e) {
          console.error("Error with HuggingFace:", e);
        }
      }
      
      // Fallback to Pollinations.ai
      const encodedPrompt = encodeURIComponent(logoPrompt + " professional vector logo, white background, high quality");
      // Add a random seed to avoid caching identical prompts
      const seed = Math.floor(Math.random() * 100000);
      generatedLogos.push(`https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`);
    }

    res.json({
      success: true,
      data: {
        ...brandingData,
        generatedLogos
      }
    });

  } catch (error: any) {
    console.error("Error generating branding:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
