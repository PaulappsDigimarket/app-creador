import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, subPackageId, extraInfo, images } = req.body;

    let numPosts = 8;
    let numReels = 2;
    let numStories = 4;
    if (subPackageId === 'sm-1') { numPosts = 8; numReels = 2; numStories = 4; }
    else if (subPackageId === 'sm-2') { numPosts = 15; numReels = 4; numStories = 8; }
    else if (subPackageId === 'sm-3') { numPosts = 20; numReels = 6; numStories = 10; }
    else if (subPackageId === 'sm-4') { numPosts = 25; numReels = 8; numStories = 12; }

    console.log(`Generating ${numPosts} posts, ${numReels} reels, ${numStories} stories for package ${subPackageId}`);

    const imageParts = (images || []).map((img: any) => {
      const imageString = typeof img === 'string' ? img : img?.url;
      if (!imageString || typeof imageString !== 'string') return null;
      const base64Data = imageString.includes(',') ? imageString.split(',')[1] : imageString;
      const mimeType = imageString.startsWith('data:') ? imageString.split(':')[1].split(';')[0] : 'image/jpeg';
      return { inlineData: { data: base64Data, mimeType } };
    }).filter(Boolean);

    const hasImages = imageParts.length > 0;

    const styleGuide = hasImages
      ? `Se han proporcionado imágenes de referencia del cliente. ANALIZA profundamente: colores corporativos, estilo visual, tipografía, ambiente y "vibe" de la marca. Todos los prompts de imagen deben mantener EXACTAMENTE ese estilo visual para consistencia de marca.`
      : `Crea un estilo visual profesional y consistente para toda la marca basado en el nombre del cliente y su industria.`;

    const prompt = `
Eres el Social Media Manager senior de DigiMarket RD, agencia líder en República Dominicana.

Cliente: "${clientName}"
Información adicional: "${extraInfo}"
${styleGuide}

GENERA EXACTAMENTE lo siguiente (no menos, no más):
- ${numPosts} posts para feed (cuadrado 1:1)
- ${numReels} reels (vertical 9:16)
- ${numStories} stories (vertical 9:16)

Para CADA pieza de contenido incluye:
1. copy: texto persuasivo con emojis adaptado al formato
2. hashtags: hashtags relevantes separados por espacios
3. imagePrompt: prompt detallado EN INGLÉS para generar la imagen, SIEMPRE basado en el estilo de referencia
4. format: "post", "reel" o "story"
5. Para reels también incluye: reelScript: guión breve de 15-30 segundos con descripción de escenas

El imagePrompt debe ser muy específico: incluir estilo fotográfico, iluminación, colores, composición, ambiente, y que sea consistente con la marca del cliente.

Responde SOLO con JSON válido.
    `;

    let socialData: any = null;

    try {
      const contents: any[] = [{
        role: 'user',
        parts: [
          { text: prompt },
          ...(hasImages ? imageParts : [])
        ]
      }];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategy: { type: Type.STRING },
              brandColors: { type: Type.STRING },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    copy: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                    format: { type: Type.STRING },
                    reelScript: { type: Type.STRING }
                  },
                  required: ["copy", "hashtags", "imagePrompt", "format"]
                }
              }
            },
            required: ["strategy", "posts"]
          }
        }
      });

      socialData = JSON.parse(response.text || "{}");
    } catch (err) {
      console.warn('Gemini with images failed, retrying without images:', err);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategy: { type: Type.STRING },
              brandColors: { type: Type.STRING },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    copy: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                    format: { type: Type.STRING },
                    reelScript: { type: Type.STRING }
                  },
                  required: ["copy", "hashtags", "imagePrompt", "format"]
                }
              }
            },
            required: ["strategy", "posts"]
          }
        }
      });
      socialData = JSON.parse(response.text || "{}");
    }

    if (!socialData.posts || socialData.posts.length === 0) {
      throw new Error('No se generaron posts. Intenta de nuevo.');
    }

    const allPosts = socialData.posts;
    const generatedPosts = [];

    for (let i = 0; i < allPosts.length; i++) {
      const post = allPosts[i];
      let imageUrl = "";

      const isFirstPost = i === 0;
      const format = post.format || 'post';
      const isReel = format === 'reel';
      const isStory = format === 'story';

      if (isFirstPost && hasImages && images[0]) {
        imageUrl = typeof images[0] === 'string' ? images[0] : images[0].url;
      } else {
        const width = isReel || isStory ? 1080 : 1080;
        const height = isReel || isStory ? 1920 : 1080;
        const cleanPrompt = encodeURIComponent(
          (post.imagePrompt || `Professional brand photography, high quality, ${clientName}`)
            .replace(/[^\w\s,.-]/g, ' ')
            .trim()
        );
        const seed = Math.floor(Math.random() * 999999);
        imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?seed=${seed}&width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;
      }

      generatedPosts.push({
        ...post,
        imageUrl,
        postNumber: i + 1,
        format: post.format || 'post'
      });
    }

    res.json({
      success: true,
      data: {
        strategy: socialData.strategy,
        brandColors: socialData.brandColors || '',
        posts: generatedPosts.filter((p: any) => p.format === 'post'),
        reels: generatedPosts.filter((p: any) => p.format === 'reel'),
        stories: generatedPosts.filter((p: any) => p.format === 'story'),
        all: generatedPosts
      }
    });

  } catch (error: any) {
    console.error('[generate-social] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}