import { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from "groq-sdk";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    const { clientName, extraInfo } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Eres el Director de Desarrollo Web de DigiMarket RD. Crea la estructura y copy para la web de: "${clientName}". Información adicional: "${extraInfo}". Responde SOLO con JSON: { "sitemap": ["Inicio", "Servicios", "Contacto"], "heroCopy": { "title": "Título", "subtitle": "Subtítulo", "cta": "Botón" }, "mockupPrompt": "modern website landing page design for [industry], UI/UX, dribbble style" }` }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const webData = JSON.parse(completion.choices[0].message.content || "{}");
    const seed = Math.floor(Math.random() * 100000);
    const mockupImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(webData.mockupPrompt + " modern website UI UX design, high quality, dribbble, behance")}?seed=${seed}&width=1280&height=800&nologo=true`;

    res.json({ success: true, data: { ...webData, mockupImage } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}