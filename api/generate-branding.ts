import Replicate from "replicate";
import { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from "groq-sdk";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    const { clientName, subPackageId, extraInfo } = req.body;

    let numLogos = 3;
    if (subPackageId === 'branding-2') numLogos = 4;
    if (subPackageId === 'branding-3') numLogos = 5;
    if (subPackageId === 'branding-4') numLogos = 1;

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
      Responde SOLO con el JSON, sin explicaciones ni markdown.
    `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const brandingData = JSON.parse(completion.choices[0].message.content || "{}");

    // Generar logos en paralelo: Replicate → HuggingFace → Pollinations
    const generatedLogos = await Promise.all(
      brandingData.logoPrompts.map(async (logoPrompt: string) => {

        // 1. Replicate
        if (process.env.REPLICATE_API_TOKEN) {
          try {
            const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
            const output = await replicate.run("black-forest-labs/flux-schnell", {
              input: { prompt: logoPrompt + " vector logo, minimalist, flat design, white background" }
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
              return `data:image/png;base64,${buffer.toString('base64')}`;
            }
          } catch (e) {
            console.warn("Replicate failed, trying HuggingFace:", e);
          }
        }

        // 2. HuggingFace
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
              return `data:image/jpeg;base64,${buffer.toString('base64')}`;
            }
          } catch (e) {
            console.warn("HuggingFace failed, using Pollinations");
          }
        }

        // 3. Pollinations
        const encodedPrompt = encodeURIComponent(logoPrompt + " professional vector logo, white background, high quality");
        const seed = Math.floor(Math.random() * 100000);
        return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
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
    res.status(500).json({ success: false, error: error.message });
  }
}