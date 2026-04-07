import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
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

    const prompt = `
      Eres el Director de Desarrollo Web de DigiMarket RD.
      Crea la estructura y el copy para la web del cliente: "${clientName}".
      Información adicional: "${extraInfo}".
      
      IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
      Analiza estas imágenes para entender la marca, el estilo y el contenido. 
      Úsalas para proponer un diseño coherente.
      
      Debes generar:
      1. Un Sitemap (lista de páginas sugeridas).
      2. El Copy principal para la página de Inicio (Hero Title, Subtitle, Call to Action).
      3. Un prompt en INGLÉS para generar un mockup visual de la página web (ej. "modern website landing page design for [industry], UI/UX, dribbble style, clean, high resolution").
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
            mockupPrompt: { type: Type.STRING }
          },
          required: ["sitemap", "heroCopy", "mockupPrompt"]
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
    res.status(500).json({ success: false, error: error.message });
  }
}
