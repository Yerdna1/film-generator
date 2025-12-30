// Google Gemini API Service
// Handles text generation, image generation, and TTS

export interface GeminiResponse {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  error?: string;
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateText(
  prompt: string,
  config: GeminiConfig
): Promise<GeminiResponse> {
  try {
    const response = await fetch(
      `${GEMINI_API_URL}/models/${config.model || 'gemini-1.5-pro'}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to generate text' };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateImage(
  prompt: string,
  config: GeminiConfig,
  aspectRatio: string = '16:9'
): Promise<GeminiResponse> {
  try {
    // Using Imagen through Gemini API
    const response = await fetch(
      `${GEMINI_API_URL}/models/imagen-3.0-generate-001:predict?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to generate image' };
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (imageBase64) {
      return { imageUrl: `data:image/png;base64,${imageBase64}` };
    }

    return { error: 'No image generated' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function generateSpeech(
  text: string,
  config: GeminiConfig,
  voiceConfig?: {
    languageCode?: string;
    voiceName?: string;
  }
): Promise<GeminiResponse> {
  try {
    // Using Gemini 2.5 Pro for TTS (Slovak support)
    const response = await fetch(
      `${GEMINI_API_URL}/models/gemini-2.5-pro:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate speech audio for the following text in ${
                    voiceConfig?.languageCode === 'sk' ? 'Slovak' : 'English'
                  }: "${text}"`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceConfig?.voiceName || 'Aoede',
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to generate speech' };
    }

    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (audioData) {
      return { audioUrl: `data:${audioData.mimeType};base64,${audioData.data}` };
    }

    return { error: 'No audio generated' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Parse Gemini response to extract characters and scenes
export function parseGeminiResponse(text: string): {
  characters: Array<{ name: string; prompt: string }>;
  scenes: Array<{
    number: number;
    title: string;
    textToImage: string;
    imageToVideo: string;
    dialogue: Array<{ character: string; text: string }>;
  }>;
} {
  const characters: Array<{ name: string; prompt: string }> = [];
  const scenes: Array<{
    number: number;
    title: string;
    textToImage: string;
    imageToVideo: string;
    dialogue: Array<{ character: string; text: string }>;
  }> = [];

  // Parse character prompts
  const characterRegex =
    /(?:CHARACTER:|Master Character Prompt[^:]*:)\s*\[?([^\]\n]+)\]?\s*(?:Text-to-Image Prompt:)?\s*([\s\S]*?)(?=(?:CHARACTER:|Master Character Prompt|SCENE|\d+\.\s*SCENE|$))/gi;
  let charMatch;
  while ((charMatch = characterRegex.exec(text)) !== null) {
    const name = charMatch[1].trim().replace(/[[\]]/g, '');
    const prompt = charMatch[2].trim();
    if (name && prompt) {
      characters.push({ name, prompt });
    }
  }

  // Parse scenes
  const sceneRegex =
    /SCENE\s*(\d+)[:\s—-]*([^\n]*)\s*(?:Text-to-Image Prompt:)?\s*([\s\S]*?)(?:Image-to-Video Prompt:)\s*([\s\S]*?)(?:Dialogue:)?\s*([\s\S]*?)(?=(?:SCENE\s*\d+|$))/gi;
  let sceneMatch;
  while ((sceneMatch = sceneRegex.exec(text)) !== null) {
    const number = parseInt(sceneMatch[1], 10);
    const title = sceneMatch[2].trim();
    const textToImage = sceneMatch[3].trim();
    const imageToVideo = sceneMatch[4].trim();
    const dialogueText = sceneMatch[5].trim();

    // Parse dialogue lines
    const dialogue: Array<{ character: string; text: string }> = [];
    const dialogueRegex = /([^:]+):\s*"([^"]+)"/g;
    let dialogueMatch;
    while ((dialogueMatch = dialogueRegex.exec(dialogueText)) !== null) {
      dialogue.push({
        character: dialogueMatch[1].trim(),
        text: dialogueMatch[2].trim(),
      });
    }

    scenes.push({ number, title, textToImage, imageToVideo, dialogue });
  }

  return { characters, scenes };
}
