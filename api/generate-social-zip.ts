import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import archiver from 'archiver';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, subPackageId, extraInfo } = req.body;

    const prompt = `
      Eres el Community Manager de DigiMarket RD.
      Crea la estrategia de redes sociales para: "${clientName}".
      Información adicional: "${extraInfo}".

      DEBES GENERAR UNA RESPUESTA JSON CON:
      1. "strategy": Estrategia completa.
      2. "contentCalendar": Array {date, platform, contentType, description}.
      3. "posts": Array {platform, text, hashtags}.
      4. "hashtagBank": Array de hashtags.
      5. "imagePrompts": Array de prompts para generar imágenes.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: { type: Type.STRING },
            contentCalendar: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  contentType: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["date", "platform", "contentType"]
              }
            },
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  text: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["platform", "text"]
              }
            },
            hashtagBank: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["strategy", "contentCalendar", "posts", "hashtagBank", "imagePrompts"]
        }
      }
    });

    const socialData = JSON.parse(response.text || "{}");

    // Crear ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName}-social-media.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    archive.append(socialData.strategy, { name: '01_ESTRATEGIA.md' });

    const csvHeaders = ['Fecha', 'Plataforma', 'Tipo', 'Descripción'];
    const csvRows = socialData.contentCalendar.map((c: any) => [c.date, c.platform, c.contentType, c.description || '']);
    const csvContent = [csvHeaders, ...csvRows].map((row: any[]) => row.join(',')).join('\n');
    archive.append(csvContent, { name: '02_CALENDARIO.csv' });

    const platforms = [...new Set(socialData.posts.map((p: any) => p.platform))] as string[];
    platforms.forEach((platform: string) => {
      const platformPosts = socialData.posts.filter((p: any) => p.platform === platform);
      const filename = `03_POSTS_${platform.replace(/\s+/g, '_').toUpperCase()}.md`;
      let content = `# Posts para ${platform}\n\n`;
      platformPosts.forEach((post: any, idx: number) => {
        const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : (post.hashtags || '');
        content += `### Post ${idx + 1}\n\n${post.text}\n\nHashtags: ${hashtags}\n\n---\n\n`;
      });
      archive.append(content, { name: filename });
    });

    archive.append(socialData.hashtagBank.join('\n'), { name: '04_HASHTAGS.txt' });
    archive.append(JSON.stringify(socialData.imagePrompts, null, 2), { name: '05_IMAGE_PROMPTS.json' });

    // Agregar prompts como URLs de Pollinations (sin bloquear el ZIP descargando imágenes)
    const imageUrlsContent = socialData.imagePrompts.map((imgPrompt: string, i: number) => {
      const encodedPrompt = encodeURIComponent(imgPrompt + " social media post, professional design, high quality");
      const seed = Math.floor(Math.random() * 100000);
      return `Imagen ${i + 1}:\nhttps://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
    }).join('\n\n');
    archive.append(imageUrlsContent, { name: '06_IMAGE_URLS.txt' });

    const readme = `# Social Media Kit para ${clientName}
Generado por DigiMarket RD - ${new Date().toISOString().split('T')[0]}`;
    archive.append(readme, { name: 'README.md' });

    await archive.finalize();

  } catch (error: any) {
    console.error("Error generating social ZIP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}