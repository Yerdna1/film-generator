// Retry configuration
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// Helper function for exponential backoff retry - continues even when tab is hidden
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a network/termination error that should be retried
      const isRetryableError =
        lastError.message.includes('terminated') ||
        lastError.message.includes('signal') ||
        lastError.message.includes('network') ||
        lastError.message.includes('abort') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Failed to fetch');

      if (!isRetryableError || attempt === maxRetries) {
        throw lastError;
      }

      // Longer delay when retrying to give Modal time to recover
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
