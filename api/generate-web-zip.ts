import { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from "groq-sdk";
import archiver from 'archiver';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    const { clientName, extraInfo } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Eres el Director de Desarrollo Web de DigiMarket RD. Crea el sitio web completo para: "${clientName}". Información adicional: "${extraInfo}". Responde SOLO con JSON: { "sitemap": ["Inicio", "Servicios", "Contacto"], "heroCopy": { "title": "Título", "subtitle": "Subtítulo", "cta": "Botón" }, "mockupPrompt": "modern website design prompt", "code": { "index.html": "código html completo", "styles.css": "código css completo", "script.js": "código js completo" } }` }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const webData = JSON.parse(completion.choices[0].message.content || "{}");
    const seed = Math.floor(Math.random() * 100000);
    const mockupImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(webData.mockupPrompt + " modern website UI UX design, high quality")}?seed=${seed}&width=1280&height=800&nologo=true`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName}-website.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    Object.entries(webData.code || {}).forEach(([filename, content]: [string, any]) => {
      archive.append(content, { name: filename });
    });
    archive.append(`# Sitio Web para ${clientName}\nGenerado por DigiMarket RD - ${new Date().toISOString().split('T')[0]}`, { name: 'README.md' });

    try {
      const imgBuffer = Buffer.from(await (await fetch(mockupImage)).arrayBuffer());
      archive.append(imgBuffer, { name: 'MOCKUP_PREVIEW.png' });
    } catch (e) {
      console.warn("No se pudo descargar mockup:", e);
    }

    await archive.finalize();
  } catch (error: any) {
    console.error("Error generating web ZIP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}