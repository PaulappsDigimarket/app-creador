// Eleven Labs API utilities for text-to-speech generation
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

export interface ElevenLabsResponse {
  audio_base64: string;
  alignment: any;
  normalized_alignment: any;
}

/**
 * Get available voices from Eleven Labs
 */
export async function getElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.voices;
}

/**
 * Generate speech from text using Eleven Labs
 * @param text - The text to convert to speech
 * @param voiceId - The voice ID to use (default: professional male voice)
 * @param model - The model to use (default: eleven_monolingual_v1)
 */
export async function generateElevenLabsSpeech(
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM', // Rachel voice (professional female)
  model: string = 'eleven_monolingual_v1'
): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Eleven Labs TTS error: ${response.status} ${response.statusText} - ${errorData}`);
  }

  // Get the audio as base64
  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  return `data:audio/mpeg;base64,${base64Audio}`;
}

/**
 * Generate speech with custom voice settings
 */
export async function generateElevenLabsSpeechAdvanced(
  text: string,
  voiceId: string,
  options: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
    model?: string;
  } = {}
): Promise<string> {
  const {
    stability = 0.5,
    similarity_boost = 0.8,
    style = 0.0,
    use_speaker_boost = true,
    model = 'eleven_monolingual_v1'
  } = options;

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Eleven Labs TTS error: ${response.status} ${response.statusText} - ${errorData}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  return `data:audio/mpeg;base64,${base64Audio}`;
}

/**
 * Popular voice IDs for different use cases
 */
export const ELEVEN_LABS_VOICES = {
  // Professional voices
  rachel: '21m00Tcm4TlvDq8ikWAM', // Professional female
  drew: '29vD33N1CtxCmqQRPOHJ', // Professional male
  clyde: '2EiwWnXFnvU5JabPnv8n', // Warm male

  // Creative voices
  paul: '5Q0t7uMcjvnagumLfvZi', // Warm story teller
  domenic: '2lBgWEtzNfQTwuqWVA2q', // Resonant male

  // Friendly voices
  dave: 'CYw3kZ02Hs0563khs1Fj', // Conversational male
  fin: 'D38z5RcWu1voky8WS1ja', // Playful male

  // Multilingual voices (Spanish)
  myra: '8M8s4j6K7kTJ9Y5pG3L', // Spanish female
  luis: 'TxGEqnHWrfWFTfGW9XjX', // Spanish male
} as const;

/**
 * Generate Spanish voice for Dominican market
 */
export async function generateSpanishVoice(
  text: string,
  voiceId: string = ELEVEN_LABS_VOICES.myra
): Promise<string> {
  return generateElevenLabsSpeech(text, voiceId, 'eleven_multilingual_v2');
}

/**
 * ALTERNATIVA GRATUITA: Generar instrucciones para voz
 * Cuando Eleven Labs requiere plan pago, esta función proporciona
 * instrucciones para generar voz usando herramientas gratuitas
 */
export function generateVoiceInstructions(text: string, language: string = 'es-DO'): {
  elevenLabsError: boolean;
  instructions: string;
  alternatives: string[];
} {
  return {
    elevenLabsError: true,
    instructions: `
INSTRUCCIONES PARA GENERAR VOZ GRATUITA:

Texto a convertir: "${text}"

OPCIÓN 1 - Web Speech API (Recomendado):
\`\`\`javascript
const synth = window.speechSynthesis;
const utterance = new SpeechSynthesisUtterance("${text}");
utterance.lang = "${language}";
utterance.rate = 0.8;
utterance.pitch = 1.0;
synth.speak(utterance);
\`\`\`

OPCIÓN 2 - Google Translate:
1. Ve a https://translate.google.com/
2. Pega el texto: "${text}"
3. Selecciona español → español
4. Haz clic en el botón de audio (🔊)

OPCIÓN 3 - Herramientas gratuitas:
- Balabolka (software gratuito para PC)
- NaturalReader (versión gratuita limitada)
- TTSMP3.com (hasta 3000 caracteres gratis)
`,
    alternatives: [
      'Web Speech API del navegador',
      'Google Translate TTS',
      'Balabolka (software gratuito)',
      'NaturalReader (versión gratuita)',
      'TTSMP3.com'
    ]
  };
}