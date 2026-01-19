/**
 * LLM API Call Wrapper with Toast Notifications
 *
 * A higher-order function that wraps LLM API calls and displays
 * toast notifications with provider, model, and duration information.
 */

import { toast } from 'sonner';
import { formatDuration, getProviderDisplayName, getModelDisplayName } from './toast-utils';

export interface LLMCallMetadata {
  provider: string;
  model: string;
  action: string;
}

/**
 * Wraps an LLM API call with toast notifications
 *
 * Shows a loading toast before the call, then updates to success/error
 * with provider, model, and duration information.
 *
 * @param metadata - Provider, model, and action information
 * @param fn - The async function to wrap (LLM API call)
 * @returns The result of the function call
 *
 * @example
 * ```typescript
 * const response = await withLLMToast(
 *   {
 *     provider: 'openrouter',
 *     model: 'anthropic/claude-4.5-sonnet',
 *     action: 'Scene Generation',
 *   },
 *   async () => {
 *     return await callOpenRouter(apiKey, systemPrompt, userPrompt, model);
 *   }
 * );
 * ```
 */
export async function withLLMToast<T>(
  metadata: LLMCallMetadata,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const providerDisplayName = getProviderDisplayName(metadata.provider);
  const modelDisplayName = getModelDisplayName(metadata.model);

  const toastId = toast.loading(`${metadata.action}...`, {
    description: `${providerDisplayName} ${modelDisplayName}`,
  });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    const durationFormatted = formatDuration(duration);

    toast.success(`${metadata.action} complete!`, {
      id: toastId,
      description: `${providerDisplayName} ${modelDisplayName} • ${durationFormatted}`,
    });

    return result;
  } catch (error) {
    toast.error(`${metadata.action} failed`, {
      id: toastId,
      description: `${providerDisplayName} ${modelDisplayName}`,
    });
    throw error;
  }
}

/**
 * Wraps an LLM API call with custom toast messages
 *
 * Same as withLLMToast but allows custom success/error messages
 *
 * @param metadata - Provider, model, and action information
 * @param fn - The async function to wrap (LLM API call)
 * @param options - Custom toast options
 * @returns The result of the function call
 */
export async function withLLMToastCustom<T>(
  metadata: LLMCallMetadata,
  fn: () => Promise<T>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showDuration?: boolean;
  } = {}
): Promise<T> {
  const startTime = Date.now();
  const providerDisplayName = getProviderDisplayName(metadata.provider);
  const modelDisplayName = getModelDisplayName(metadata.model);
  const {
    successMessage = `${metadata.action} complete!`,
    errorMessage = `${metadata.action} failed`,
    showDuration = true,
  } = options;

  const toastId = toast.loading(`${metadata.action}...`, {
    description: `${providerDisplayName} ${modelDisplayName}`,
  });

  try {
    const result = await fn();
    let description = `${providerDisplayName} ${modelDisplayName}`;

    if (showDuration) {
      const duration = Date.now() - startTime;
      const durationFormatted = formatDuration(duration);
      description += ` • ${durationFormatted}`;
    }

    toast.success(successMessage, {
      id: toastId,
      description,
    });

    return result;
  } catch (error) {
    toast.error(errorMessage, {
      id: toastId,
      description: `${providerDisplayName} ${modelDisplayName}`,
    });
    throw error;
  }
}
