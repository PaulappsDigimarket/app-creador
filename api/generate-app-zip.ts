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
      Eres el Arquitecto de Software de DigiMarket RD.
      Diseña la aplicación web para: "${clientName}".
      Información adicional: "${extraInfo}".

      DEBES GENERAR UNA RESPUESTA JSON CON:
      1. "architecture": Descripción de la arquitectura.
      2. "dbSchema": Modelo de datos.
      3. "apiSpec": Especificación de endpoints REST.
      4. "modules": Array de módulos/funcionalidades.
      5. "screens": Array de pantallas principales.
      6. "code": Objeto con archivos del frontend.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            architecture: { type: Type.STRING },
            dbSchema: { type: Type.STRING },
            apiSpec: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            modules: { type: Type.ARRAY, items: { type: Type.STRING } },
            screens: { type: Type.ARRAY, items: { type: Type.STRING } },
            code: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
          },
          required: ["architecture", "dbSchema", "apiSpec", "modules", "screens", "code"]
        }
      }
    });

    const appData = JSON.parse(response.text || "{}");

    // Crear ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName}-app.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    Object.entries(appData.code).forEach(([filename, content]: [string, any]) => {
      archive.append(content, { name: filename });
    });

    archive.append(appData.architecture, { name: 'ARCHITECTURE.md' });
    archive.append(appData.dbSchema, { name: 'DATABASE_SCHEMA.sql' });
    archive.append(JSON.stringify(appData.apiSpec, null, 2), { name: 'API_SPEC.json' });

    const screensContent = `# Pantallas de la aplicación\n\n${appData.screens.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    archive.append(screensContent, { name: 'SCREENS.md' });

    const modulesContent = `# Módulos\n\n${appData.modules.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}`;
    archive.append(modulesContent, { name: 'MODULES.md' });

    const readme = `# Aplicación Web para ${clientName}
Generado por DigiMarket RD - ${new Date().toISOString().split('T')[0]}`;
    archive.append(readme, { name: 'README.md' });

    await archive.finalize();

  } catch (error: any) {
    console.error("Error generating app ZIP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}