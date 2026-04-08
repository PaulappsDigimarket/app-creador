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

    // Función auxiliar para generar marketing sin imágenes si hay problemas
    const generateMarketingWithoutImages = async () => {
      console.log('Generating marketing plan without images due to size limits');
      const simplePrompt = `
        Eres el Director de Marketing Digital de DigiMarket RD.
        Crea una planificación estratégica completa de marketing digital para el cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        IMPORTANTE: El cliente ha subido imágenes de referencia, pero debido a limitaciones técnicas, generarás la estrategia basada en la descripción textual.

        Debes generar un JSON con exactamente esta estructura:
        {
          "executiveSummary": "Resumen ejecutivo de la estrategia",
          "marketAnalysis": {
            "targetAudience": "Descripción detallada del público objetivo",
            "competitors": ["competidor1", "competidor2"],
            "marketTrends": ["tendencia1", "tendencia2"]
          },
          "strategy": {
            "objectives": ["objetivo1", "objetivo2"],
            "channels": ["canal1", "canal2"],
            "contentStrategy": "Estrategia de contenido detallada"
          },
          "actionPlan": [
            {
              "month": 1,
              "activities": ["actividad1", "actividad2"],
              "budget": "RD$ X,XXX",
              "kpis": ["kpi1", "kpi2"]
            }
          ],
          "budget": {
            "total": "RD$ XX,XXX",
            "breakdown": {
              "ads": "RD$ X,XXX",
              "content": "RD$ X,XXX",
              "tools": "RD$ X,XXX"
            }
          },
          "implementation": {
            "timeline": "Cronograma detallado",
            "resources": ["recurso1", "recurso2"],
            "successMetrics": ["métrica1", "métrica2"]
          }
        }

        Genera un plan de 6 meses.
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
              executiveSummary: { type: Type.STRING },
              marketAnalysis: {
                type: Type.OBJECT,
                properties: {
                  targetAudience: { type: Type.STRING },
                  competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  marketTrends: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["targetAudience", "competitors", "marketTrends"]
              },
              strategy: {
                type: Type.OBJECT,
                properties: {
                  objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                  channels: { type: Type.ARRAY, items: { type: Type.STRING } },
                  contentStrategy: { type: Type.STRING }
                },
                required: ["objectives", "channels", "contentStrategy"]
              },
              actionPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.NUMBER },
                    activities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    budget: { type: Type.STRING },
                    kpis: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["month", "activities", "budget", "kpis"]
                }
              },
              budget: {
                type: Type.OBJECT,
                properties: {
                  total: { type: Type.STRING },
                  breakdown: {
                    type: Type.OBJECT,
                    properties: {
                      ads: { type: Type.STRING },
                      content: { type: Type.STRING },
                      tools: { type: Type.STRING }
                    }
                  }
                },
                required: ["total", "breakdown"]
              },
              implementation: {
                type: Type.OBJECT,
                properties: {
                  timeline: { type: Type.STRING },
                  resources: { type: Type.ARRAY, items: { type: Type.STRING } },
                  successMetrics: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["timeline", "resources", "successMetrics"]
              }
            },
            required: ["executiveSummary", "marketAnalysis", "strategy", "actionPlan", "budget", "implementation"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    };

    const prompt = `
      Eres el Director de Marketing Digital de DigiMarket RD.
      Crea una planificación estratégica completa de marketing digital para el cliente: "${clientName}".
      Información adicional: "${extraInfo}".

      IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia.
      Analiza estas imágenes para entender mejor la marca, el estilo visual y el público objetivo del cliente.

      DEBES GENERAR UNA RESPUESTA JSON CON:
      1. "executiveSummary": Resumen ejecutivo de la estrategia (2-3 párrafos)
      2. "marketAnalysis": Análisis de mercado con público objetivo, competidores y tendencias
      3. "strategy": Estrategia con objetivos, canales y estrategia de contenido
      4. "actionPlan": Plan de acción mensual para 6 meses con actividades, presupuesto y KPIs
      5. "budget": Presupuesto total y desglose por categorías
      6. "implementation": Timeline, recursos necesarios y métricas de éxito

      El plan debe ser REALISTA, ACCIONABLE y COMPLETO.
      Incluye presupuestos específicos en pesos dominicanos (RD$).
      Considera el contexto local de República Dominicana.
    `;

    let marketingData;
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
              executiveSummary: { type: Type.STRING, description: "Resumen ejecutivo de 2-3 párrafos" },
              marketAnalysis: {
                type: Type.OBJECT,
                properties: {
                  targetAudience: { type: Type.STRING, description: "Descripción detallada del público objetivo" },
                  competitors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de principales competidores" },
                  marketTrends: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tendencias del mercado relevantes" }
                },
                required: ["targetAudience", "competitors", "marketTrends"]
              },
              strategy: {
                type: Type.OBJECT,
                properties: {
                  objectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Objetivos SMART del plan" },
                  channels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Canales digitales a utilizar" },
                  contentStrategy: { type: Type.STRING, description: "Estrategia de contenido detallada" }
                },
                required: ["objectives", "channels", "contentStrategy"]
              },
              actionPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.NUMBER, description: "Número del mes (1-6)" },
                    activities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actividades del mes" },
                    budget: { type: Type.STRING, description: "Presupuesto mensual estimado" },
                    kpis: { type: Type.ARRAY, items: { type: Type.STRING }, description: "KPIs a medir" }
                  },
                  required: ["month", "activities", "budget", "kpis"]
                },
                description: "Plan de 6 meses"
              },
              budget: {
                type: Type.OBJECT,
                properties: {
                  total: { type: Type.STRING, description: "Presupuesto total del plan" },
                  breakdown: {
                    type: Type.OBJECT,
                    properties: {
                      ads: { type: Type.STRING, description: "Presupuesto para publicidad" },
                      content: { type: Type.STRING, description: "Presupuesto para contenido" },
                      tools: { type: Type.STRING, description: "Presupuesto para herramientas" }
                    }
                  }
                },
                required: ["total", "breakdown"]
              },
              implementation: {
                type: Type.OBJECT,
                properties: {
                  timeline: { type: Type.STRING, description: "Cronograma de implementación" },
                  resources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recursos necesarios" },
                  successMetrics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Métricas de éxito" }
                },
                required: ["timeline", "resources", "successMetrics"]
              }
            },
            required: ["executiveSummary", "marketAnalysis", "strategy", "actionPlan", "budget", "implementation"]
          }
        }
      });

      const resultText = response.text || "{}";
      console.log(`Marketing plan generated, length: ${resultText.length}`);
      marketingData = JSON.parse(resultText);
    } catch (error) {
      console.warn('Error with images in marketing generation, trying without images:', error);
      marketingData = await generateMarketingWithoutImages();
    }

    res.json({ success: true, data: marketingData });
  } catch (error: any) {
    console.error("Error generating marketing plan:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}