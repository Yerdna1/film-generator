// Debounce helper for syncing to database
let syncTimeout: NodeJS.Timeout | null = null;

export const debounceSync = (fn: () => void, delay: number = 500) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(fn, delay);
};
