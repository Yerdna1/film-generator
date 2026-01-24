import type { DialogueLineWithScene } from '../../types';

export type DialogueFilter = 'all' | 'without-audio' | 'none';

/**
 * Collects dialogue lines from scenes based on filter criteria
 */
export function collectDialogueLines(
  scenes: Array<{ dialogue?: any[]; id: string; title: string; number: number } | undefined> | undefined,
  filter: DialogueFilter = 'without-audio',
  selectedLineIds?: Set<string>
): DialogueLineWithScene[] {
  const dialogueLines: DialogueLineWithScene[] = [];

  (scenes || []).forEach(scene => {
    if (!scene) return;
    const dialogue = scene.dialogue || [];

    dialogue.forEach((line: any) => {
      // Skip if filtering and line doesn't match criteria
      if (filter === 'without-audio' && line.audioUrl) return;
      if (filter === 'none' && selectedLineIds && !selectedLineIds.has(line.id)) return;

      dialogueLines.push({
        id: line.id,
        sceneId: scene.id,
        sceneTitle: scene.title,
        sceneNumber: scene.number,
        text: line.text,
        characterId: line.characterId,
        characterName: line.characterName,
      });
    });
  });

  return dialogueLines;
}

/**
 * Collects all dialogue lines without audio
 */
export function collectLinesWithoutAudio(
  scenes: Array<{ dialogue?: any[]; id: string; title: string; number: number } | undefined> | undefined
): DialogueLineWithScene[] {
  return collectDialogueLines(scenes, 'without-audio');
}

/**
 * Collects all dialogue lines (including those with audio)
 */
export function collectAllDialogueLines(
  scenes: Array<{ dialogue?: any[]; id: string; title: string; number: number } | undefined> | undefined
): DialogueLineWithScene[] {
  return collectDialogueLines(scenes, 'all');
}

/**
 * Collects selected dialogue lines by IDs
 */
export function collectSelectedDialogueLines(
  scenes: Array<{ dialogue?: any[]; id: string; title: string; number: number } | undefined> | undefined,
  selectedIds: Set<string>
): DialogueLineWithScene[] {
  return collectDialogueLines(scenes, 'none', selectedIds);
}

/**
 * Gets a batch of dialogue lines without audio
 */
export function collectDialogueBatch(
  scenes: Array<{ dialogue?: any[]; id: string; title: string; number: number } | undefined> | undefined,
  batchSize: number
): DialogueLineWithScene[] {
  const allLines = collectLinesWithoutAudio(scenes);
  return allLines.slice(0, batchSize);
}
