import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, subPackageId, extraInfo, images } = req.body;

    // Determinar cantidad de posts según el paquete
    let numPosts = 4; // default
    if (subPackageId === 'sm-1') numPosts = 8;
    else if (subPackageId === 'sm-2') numPosts = 15;
    else if (subPackageId === 'sm-3') numPosts = 20;
    else if (subPackageId === 'sm-4') numPosts = 25;

    console.log(`Generating ${numPosts} social media posts for package ${subPackageId}`);

    // Convert images to Gemini parts if they exist
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

    // Función auxiliar para generar social sin imágenes si hay problemas
    const generateSocialWithoutImages = async () => {
      console.log('Generating social media posts without images due to size limits');
      const simplePrompt = `
        Eres el Social Media Manager de DigiMarket RD.
        Crea una tanda de ${numPosts} posts para las redes sociales del cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        IMPORTANTE: El cliente ha subido imágenes de referencia, pero debido a limitaciones técnicas, generarás los posts basados en la descripción textual.

        Para cada post debes generar:
        1. El texto (copy) persuasivo con emojis.
        2. Los hashtags recomendados.
        3. Un prompt detallado en INGLÉS para generar la imagen.

        Genera exactamente ${numPosts} posts.
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
      Crea una tanda de ${numPosts} posts para las redes sociales del cliente: "${clientName}".
      Información adicional: "${extraInfo}".

      IMPORTANTE - GUÍA DE ESTILO:
      Se ha proporcionado una imagen de referencia.
      1. Analiza profundamente el estilo visual de esta imagen (colores, iluminación, tipo de fotografía, ambiente, composición).
      2. El POST #1 DEBE usar obligatoriamente la imagen de referencia proporcionada (referenceImageIndex: 0).
      3. Para los POSTS #2 al #${numPosts}, debes generar prompts en INGLÉS que describan escenas NUEVAS pero que mantengan EXACTAMENTE el mismo estilo visual, paleta de colores, iluminación, composición y "vibe" de la imagen de referencia. Queremos que TODOS los posts parezcan de la misma sesión de fotos y marca consistente.

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
                    referenceImageIndex: { type: [Type.NUMBER, Type.NULL], description: "0 para usar la foto subida, null para generar una nueva" }
                  },
                  required: ["copy", "hashtags", "imagePrompt"]
                }
              }
            },
            required: ["strategy", "posts"]
          }
        }
      });

      // Intentar parsear la respuesta como JSON
      try {
        socialData = JSON.parse(response.text || "{}");
      } catch (parseError) {
        console.error('Error parsing Gemini response as JSON:', parseError);
        console.log('Raw response:', response.text);
        // Si falla el parseo, usar la función sin imágenes
        socialData = await generateSocialWithoutImages();
      }
    } catch (error) {
      console.warn('Error with images in social media generation, trying without images:', error);
      socialData = await generateSocialWithoutImages();
    }

    // Generate/Map Images
    const generatedPosts = [];
    console.log(`Processing ${socialData.posts.length} posts with ${images?.length || 0} reference images`);

    for (let i = 0; i < socialData.posts.length; i++) {
      const post = socialData.posts[i];
      let imageUrl = "";

      // El primer post SIEMPRE usa la imagen de referencia si existe
      if (i === 0 && images && images[0]) {
        imageUrl = typeof images[0] === 'string' ? images[0] : images[0].url;
        console.log(`Post ${i + 1}: Using reference image`);
      } else {
        // Los demás posts generan imágenes nuevas pero consistentes
        const stylePrompt = post.imagePrompt || `Professional business photography in the same style as the reference image, consistent lighting and colors`;
        const encodedPrompt = encodeURIComponent(stylePrompt + " --v 6.0 --style raw --ar 1:1 --quality 2");
        const seed = Math.floor(Math.random() * 100000);
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1080&height=1080&nologo=true&model=flux`;
        console.log(`Post ${i + 1}: Generating new image with consistent style`);
      }

      generatedPosts.push({
        ...post,
        imageUrl,
        postNumber: i + 1
      });
    }

    console.log(`Successfully generated ${generatedPosts.length} posts`);
    res.json({ success: true, data: { strategy: socialData.strategy, posts: generatedPosts } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
