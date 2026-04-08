import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { generateElevenLabsSpeech, ELEVEN_LABS_VOICES, generateVoiceInstructions } from '../lib/elevenlabs';

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

    // Función auxiliar para generar videos sin imágenes si hay problemas
    const generateVideosWithoutImages = async () => {
      console.log('Generating videos without images due to size limits');
      const simplePrompt = `
        Eres el Director de Video Marketing de DigiMarket RD.
        Crea una serie de videos reels para el cliente: "${clientName}".
        Información adicional: "${extraInfo}".

        IMPORTANTE: El cliente ha subido imágenes de referencia, pero debido a limitaciones técnicas, generarás los videos basados en la descripción textual.

        Debes generar un JSON con exactamente esta estructura:
        {
          "strategy": "Estrategia general de video marketing",
          "videos": [
            {
              "title": "Título del video",
              "duration": "15-30 segundos",
              "script": "Guión completo del video",
              "voiceover": "Texto para voz en off",
              "visualStyle": "Estilo visual descriptivo",
              "callToAction": "CTA al final",
              "hashtags": ["#hashtag1", "#hashtag2"],
              "platform": "Instagram/TikTok"
            }
          ],
          "voiceSettings": {
            "voiceId": "21m00Tcm4TlvDq8ikWAM",
            "language": "es",
            "style": "professional"
          }
        }

        Genera exactamente 5 videos para reels.
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
              videos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    script: { type: Type.STRING },
                    voiceover: { type: Type.STRING },
                    visualStyle: { type: Type.STRING },
                    callToAction: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    platform: { type: Type.STRING }
                  },
                  required: ["title", "duration", "script", "voiceover", "visualStyle", "callToAction", "hashtags", "platform"]
                }
              },
              voiceSettings: {
                type: Type.OBJECT,
                properties: {
                  voiceId: { type: Type.STRING },
                  language: { type: Type.STRING },
                  style: { type: Type.STRING }
                },
                required: ["voiceId", "language", "style"]
              }
            },
            required: ["strategy", "videos", "voiceSettings"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    };

    const prompt = `
      Eres el Director de Video Marketing de DigiMarket RD.
      Crea una serie completa de videos reels para el cliente: "${clientName}".
      Información adicional: "${extraInfo}".

      IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia.
      Analiza estas imágenes para entender el estilo visual, la marca y el público objetivo.

      DEBES GENERAR UNA RESPUESTA JSON CON:
      1. "strategy": Estrategia general de video marketing (2-3 párrafos)
      2. "videos": Array de videos con título, duración, guión, voz en off, estilo visual, CTA, hashtags y plataforma
      3. "voiceSettings": Configuración de voz para Eleven Labs (voiceId, language, style)

      Cada video debe ser optimizado para reels (15-30 segundos).
      Incluye guiones detallados pero concisos.
      Los voiceovers deben ser naturales y persuasivos.
      Considera el mercado dominicano y el español como idioma principal.
      Usa voces profesionales de Eleven Labs.
    `;

    let videoData;
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
              strategy: { type: Type.STRING, description: "Estrategia general de video marketing" },
              videos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Título atractivo del video" },
                    duration: { type: Type.STRING, description: "Duración estimada (15-30s)" },
                    script: { type: Type.STRING, description: "Guión completo con indicaciones visuales" },
                    voiceover: { type: Type.STRING, description: "Texto exacto para voz en off" },
                    visualStyle: { type: Type.STRING, description: "Descripción del estilo visual" },
                    callToAction: { type: Type.STRING, description: "CTA claro y persuasivo" },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hashtags relevantes" },
                    platform: { type: Type.STRING, description: "Plataforma principal (Instagram/TikTok)" }
                  },
                  required: ["title", "duration", "script", "voiceover", "visualStyle", "callToAction", "hashtags", "platform"]
                },
                description: "Array de 5-15 videos según el paquete"
              },
              voiceSettings: {
                type: Type.OBJECT,
                properties: {
                  voiceId: { type: Type.STRING, description: "ID de voz de Eleven Labs" },
                  language: { type: Type.STRING, description: "Idioma (es/en)" },
                  style: { type: Type.STRING, description: "Estilo de voz (professional/friendly)" }
                },
                required: ["voiceId", "language", "style"]
              }
            },
            required: ["strategy", "videos", "voiceSettings"]
          }
        }
      });

      const resultText = response.text || "{}";
      console.log(`Video content generated, length: ${resultText.length}`);
      videoData = JSON.parse(resultText);
    } catch (error) {
      console.warn('Error with images in video generation, trying without images:', error);
      videoData = await generateVideosWithoutImages();
    }

    // Generate voiceovers for each video using Eleven Labs
    const videosWithAudio = [];
    for (const video of videoData.videos) {
      try {
        console.log(`Generating voiceover for video: ${video.title}`);
        const audioUrl = await generateElevenLabsSpeech(
          video.voiceover,
          videoData.voiceSettings.voiceId || ELEVEN_LABS_VOICES.myra,
          'eleven_multilingual_v2'
        );
        videosWithAudio.push({
          ...video,
          audioUrl
        });
      } catch (audioError: any) {
        console.warn(`Failed to generate audio for video ${video.title}:`, audioError);

        // Si es error de plan pago, proporcionar alternativas gratuitas
        if (audioError.message.includes('paid_plan_required') ||
            audioError.message.includes('payment_required') ||
            audioError.message.includes('invalid_api_key') ||
            audioError.message.includes('Unauthorized')) {
          const voiceInstructions = generateVoiceInstructions(video.voiceover, 'es-DO');
          videosWithAudio.push({
            ...video,
            audioUrl: null,
            audioError: 'Eleven Labs requiere plan pago para voces de librería',
            voiceInstructions: voiceInstructions.instructions,
            freeAlternatives: voiceInstructions.alternatives
          });
        } else {
          // Otro tipo de error
          videosWithAudio.push({
            ...video,
            audioUrl: null,
            audioError: `Error generando voz: ${audioError.message}`
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...videoData,
        videos: videosWithAudio
      }
    });
  } catch (error: any) {
    console.error("Error generating videos:", error);
    console.error("Error message:", error.message);

    // SIEMPRE proporcionar alternativas gratuitas cuando hay cualquier error
    const voiceInstructions = generateVoiceInstructions(
      `Contenido de video para ${req.body.clientName || 'cliente'}. ${req.body.extraInfo || 'marketing digital'}`,
      'es-DO'
    );

    res.json({
      success: false,
      elevenLabsError: true,
      error: error.message || 'Error desconocido en la generación de video',
      voiceInstructions: {
        instructions: voiceInstructions.instructions,
        alternatives: voiceInstructions.alternatives
      },
      fallbackInfo: {
        message: 'Usa las siguientes alternativas gratuitas para generar voz',
        recommended: 'Web Speech API del navegador'
      }
    });
  }
}