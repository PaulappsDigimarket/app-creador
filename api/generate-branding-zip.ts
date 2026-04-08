import Replicate from "replicate";
import { VercelRequest, VercelResponse } from "@vercel/node";
import Groq from "groq-sdk";
import archiver from "archiver";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN || "" });
    const { clientName, extraInfo } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `Eres el Director Creativo de DigiMarket RD. Crea la identidad visual para: "${clientName}". Información adicional: "${extraInfo}". Responde SOLO con JSON: { "brandManual": "Manual en Markdown", "colorPalette": [{ "hex": "#FF0000", "name": "Nombre", "usage": "Principal" }], "typography": [{ "name": "Fuente", "usage": "Principal" }], "logoPrompts": ["prompt en inglés, vector logo, minimalist, flat design, white background"] }`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const brandingData = JSON.parse(completion.choices[0].message.content || "{}");

    const logoBuffers = await Promise.all(
      (brandingData.logoPrompts || []).map(async (p: string, i: number) => {
        try {
          const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: {
              prompt: p + " professional vector logo, white background, high quality"
            }
          });

          const fileOutput = Array.isArray(output) ? output[0] : output;

          return {
            buffer: Buffer.from(await fileOutput.arrayBuffer()),
            index: i
          };
        } catch (err) {
          console.warn(`Failed to generate logo ${i + 1}:`, err);
          return null;
        }
      })
    );

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${clientName}-branding.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    archive.append(brandingData.brandManual || "", { name: "01_MANUAL_DE_MARCA.md" });
    archive.append(JSON.stringify(brandingData.colorPalette || [], null, 2), { name: "02_PALETA_COLORES.json" });
    archive.append(JSON.stringify(brandingData.typography || [], null, 2), { name: "03_TIPOGRAFIAS.json" });
    archive.append(JSON.stringify(brandingData.logoPrompts || [], null, 2), { name: "04_LOGO_PROMPTS.json" });

    logoBuffers.forEach((item) => {
      if (item) {
        archive.append(item.buffer, { name: `05_LOGO_${item.index + 1}.png` });
      }
    });

    archive.append(
      `# Paquete de Branding para ${clientName}\nGenerado por DigiMarket RD - ${new Date().toISOString().split("T")[0]}`,
      { name: "README.md" }
    );

    await archive.finalize();
  } catch (error: any) {
    console.error("Error generating branding ZIP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}