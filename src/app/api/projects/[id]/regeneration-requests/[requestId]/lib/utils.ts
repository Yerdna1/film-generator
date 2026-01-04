import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { LogEntry } from './types';

/**
 * Add a log entry to a regeneration request
 */
export async function addLog(requestId: string, entry: Omit<LogEntry, 'timestamp'>) {
  const request = await prisma.regenerationRequest.findUnique({
    where: { id: requestId },
    select: { logs: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentLogs = (request?.logs as any[]) || [];
  const newLog = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  await prisma.regenerationRequest.update({
    where: { id: requestId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs: [...currentLogs, newLog] as any,
    },
  });
}

/**
 * Build full I2V prompt with dialogue (same as normal generation)
 */
export function buildFullI2VPrompt(
  imageToVideoPrompt: string | null,
  dialogue: unknown[] | null
): string {
  let prompt = imageToVideoPrompt || '';
  if (dialogue && Array.isArray(dialogue) && dialogue.length > 0) {
    const dialogueText = (dialogue as Array<{ characterName?: string; text?: string }>)
      .map((d) => `${d.characterName || 'Unknown'}: "${d.text || ''}"`)
      .join('\n');
    prompt += `\n\nDialogue:\n${dialogueText}`;
  }
  return prompt;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Prisma.InputJsonValue;
  actionUrl: string;
}) {
  await prisma.notification.create({
    data: params,
  });
}
