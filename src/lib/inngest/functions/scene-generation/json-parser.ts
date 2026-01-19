import type { Scene } from './types';

export function parseLLMResponse(fullResponse: string, batchIndex: number): Scene[] {
  // Parse JSON response with multiple fallback strategies
  let cleanResponse = fullResponse.trim();

  // Strategy 1: Remove markdown code blocks
  if (cleanResponse.startsWith('```json')) cleanResponse = cleanResponse.slice(7);
  if (cleanResponse.startsWith('```')) cleanResponse = cleanResponse.slice(3);
  if (cleanResponse.endsWith('```')) cleanResponse = cleanResponse.slice(0, -3);
  cleanResponse = cleanResponse.trim();

  let scenes: Scene[];
  try {
    scenes = JSON.parse(cleanResponse);
  } catch (parseError1) {
    // Strategy 2: Find JSON array in response
    const jsonArrayMatch = fullResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonArrayMatch) {
      try {
        scenes = JSON.parse(jsonArrayMatch[0]);
      } catch (parseError2) {
        // Strategy 3: Try to fix common JSON issues
        let fixedJson = jsonArrayMatch[0]
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
          .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters

        try {
          scenes = JSON.parse(fixedJson);
        } catch (parseError3) {
          console.error(`[Inngest Scenes] Batch ${batchIndex + 1} JSON parse failed after 3 attempts`);
          console.error(`[Inngest Scenes] Response start:`, fullResponse.slice(0, 300));
          console.error(`[Inngest Scenes] Response end:`, fullResponse.slice(-300));
          throw new Error(`Failed to parse LLM response as JSON for batch ${batchIndex + 1}`);
        }
      }
    } else {
      console.error(`[Inngest Scenes] Batch ${batchIndex + 1} no JSON array found in response`);
      console.error(`[Inngest Scenes] Response:`, fullResponse.slice(0, 500));
      throw new Error(`No JSON array found in LLM response for batch ${batchIndex + 1}`);
    }
  }

  return scenes;
}

export function validateScenes(scenes: unknown, batchSize: number, batchIndex: number): scenes is Scene[] {
  if (!Array.isArray(scenes)) {
    throw new Error(`Batch ${batchIndex + 1} returned non-array response`);
  }

  if (scenes.length < batchSize) {
    console.warn(`[Inngest Scenes] Batch ${batchIndex + 1} returned ${scenes.length}/${batchSize} scenes - retrying`);
    throw new Error(`Batch ${batchIndex + 1} returned only ${scenes.length} of ${batchSize} expected scenes`);
  }

  return true;
}
