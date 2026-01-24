import { toast } from '@/lib/toast';
import type { DialogueLineWithScene } from '../../types';
import type { VoiceoverGenerationOptions, VoiceoverGenerationResult, AudioLineRequest } from './types';

export interface VoiceoverApiClientOptions {
  projectId: string;
  language: string;
  characters?: Array<{ id: string; voiceId?: string | null } | undefined> | undefined;
  onSetGenerating: (lineIds: string[]) => void;
  onClearGenerating: (lineIds: string[]) => void;
  onInsufficientCredits?: () => void;
}

/**
 * Prepares audio lines for batch processing
 */
export function prepareAudioLines(
  dialogueLines: DialogueLineWithScene[],
  characters: Array<{ id: string; voiceId?: string | null } | undefined> | undefined
): AudioLineRequest[] {
  return dialogueLines.map(line => {
    const character = characters?.find(c => c?.id === line.characterId);
    return {
      lineId: line.id,
      sceneId: line.sceneId,
      sceneNumber: line.sceneNumber,
      text: line.text,
      characterId: line.characterId,
      voiceId: character!.voiceId!, // Assumed validated before calling
    };
  });
}

/**
 * Starts voiceover generation by calling the API
 */
export async function startVoiceoverGeneration(
  dialogueLines: DialogueLineWithScene[],
  options: VoiceoverApiClientOptions
): Promise<VoiceoverGenerationResult> {
  const { projectId, language, characters, onSetGenerating, onClearGenerating } = options;

  if (dialogueLines.length === 0) {
    return { success: false };
  }

  // Update UI to show generating state
  const lineIds = dialogueLines.map(line => line.id);
  onSetGenerating(lineIds);

  try {
    // Prepare audio lines for batch processing
    const audioLines = prepareAudioLines(dialogueLines, characters);

    const response = await fetch('/api/voiceover/generate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        audioLines,
        language,
      }),
    });

    // Check response.ok FIRST before calling handleApiResponse
    if (!response.ok) {
      // Clear generating state on error
      onClearGenerating(lineIds);

      // Parse error safely
      let errorMessage = 'Failed to start voiceover generation';
      try {
        const error = await response.json();
        if (error && typeof error === 'object') {
          errorMessage = error.error || error.message || errorMessage;
        }
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }

      // Show error toast
      toast.error('Failed to start voiceover generation', {
        description: errorMessage,
      });

      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    const jobId = data.jobId;

    if (!jobId) {
      throw new Error('No job ID returned from server');
    }

    // Show toast for batch generation
    if (audioLines.length === 1) {
      console.log(`[Voiceover Generation] Started job ${jobId} for single line`);
    } else {
      toast.info(`Started generating ${audioLines.length} voiceovers`, {
        description: 'Progress will be shown below.',
      });
    }

    return { success: true, jobId };

  } catch (error) {
    console.error('Error starting voiceover generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    toast.error('Failed to start voiceover generation', {
      description: errorMessage,
    });

    // Clear generating state on error
    onClearGenerating(lineIds);

    return { success: false, error: errorMessage };
  }
}

/**
 * Parses error details from job errorDetails field
 */
export function parseErrorDetails(errorDetails?: string): string {
  if (!errorDetails) return 'Unknown error';

  try {
    const errors = JSON.parse(errorDetails);
    if (Array.isArray(errors) && errors.length > 0 && errors[0]?.error) {
      return errors[0].error;
    }
    return errorDetails;
  } catch (e) {
    console.error('Failed to parse errorDetails:', e);
    return errorDetails;
  }
}
