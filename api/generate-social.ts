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

    // Función auxiliar para generar social sin imágenes si hay problemas
    const generateSocialWithoutImages = async () => {
      console.log('Generating social media posts without images due to size limits');
      const simplePrompt = `
        Eres el Social Media Manager de DigiMarket RD.
        Crea una tanda de 4 posts para las redes sociales del cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        IMPORTANTE: El cliente ha subido imágenes de referencia, pero debido a limitaciones técnicas, generarás los posts basados en la descripción textual.

        Para cada post debes generar:
        1. El texto (copy) persuasivo con emojis.
        2. Los hashtags recomendados.
        3. Un prompt detallado en INGLÉS para generar la imagen.

        Genera exactamente 4 posts.
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
              strategy: { type: Type.STRING },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    copy: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                  },
                  required: ["copy", "hashtags", "imagePrompt"]
                }
              }
            },
            required: ["strategy", "posts"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    };

    const prompt = `
      Eres el Social Media Manager de DigiMarket RD.
      Crea una tanda de 4 posts para las redes sociales del cliente: "${clientName}".
      Información adicional: "${extraInfo}".
      
      IMPORTANTE - GUÍA DE ESTILO: 
      Se ha proporcionado una imagen de referencia. 
      1. Analiza profundamente el estilo visual de esta imagen (colores, iluminación, tipo de fotografía, ambiente).
      2. El POST #1 DEBE usar obligatoriamente la imagen de referencia proporcionada (referenceImageIndex: 0).
      3. Para los POSTS #2, #3 y #4, debes generar prompts en INGLÉS que describan escenas NUEVAS pero que mantengan EXACTAMENTE el mismo estilo visual, paleta de colores y "vibe" de la imagen de referencia. Queremos que parezcan de la misma sesión de fotos.
      
      Para cada post debes generar:
      1. El texto (copy) persuasivo con emojis.
      2. Los hashtags recomendados.
      3. Un prompt detallado en INGLÉS para generar la imagen (solo para los posts que no usan la referencia).
      4. El índice de la imagen de referencia a usar (0 para el primer post, null para los demás).
    `;

    let socialData;
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
              strategy: { type: Type.STRING, description: "Breve resumen de la estrategia de consistencia visual" },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    copy: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING, description: "Prompt en inglés que IMITA el estilo de la referencia" },
                    referenceImageIndex: { type: Type.NUMBER, description: "0 para usar la foto subida, null para generar una nueva" }
                  },
                  required: ["copy", "hashtags", "imagePrompt"]
                }
              }
            },
            required: ["strategy", "posts"]
          }
        }
      });

      socialData = JSON.parse(response.text || "{}");
    } catch (error) {
      console.warn('Error with images in social media generation, trying without images:', error);
      socialData = await generateSocialWithoutImages();
    }

    // Generate/Map Images
    const generatedPosts = [];
    for (let i = 0; i < socialData.posts.length; i++) {
      const post = socialData.posts[i];
      let imageUrl = "";

      // Si la IA dice que usemos la referencia (índice 0) y existe
      if (post.referenceImageIndex === 0 && images && images[0]) {
        imageUrl = images[0];
      } else {
        // Si no, generamos una nueva basada en el prompt de estilo
        const encodedPrompt = encodeURIComponent(post.imagePrompt + " --v 6.0 --style raw --ar 1:1");
        const seed = Math.floor(Math.random() * 100000);
        // Usamos un motor de renderizado más potente en el prompt
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1080&height=1080&nologo=true&model=flux`;
      }
      
      generatedPosts.push({ ...post, imageUrl });
    }

    res.json({ success: true, data: { strategy: socialData.strategy, posts: generatedPosts } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
