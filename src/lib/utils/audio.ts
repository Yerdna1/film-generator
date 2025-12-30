/**
 * Audio utility functions for volume conversion
 */

/**
 * Convert decibels to linear volume (0-1 scale)
 * Range: -30dB to 0dB (mapped to 0.0316 to 1.0 linear)
 * @param dB - Decibel value (-30 to 0)
 * @returns Linear volume (0 to 1)
 */
export const dBToLinear = (dB: number): number => {
  // dB = 20 * log10(linear), so linear = 10^(dB/20)
  const linear = Math.pow(10, dB / 20);
  return Math.min(linear, 1); // Cap at 1.0 for HTML audio
};

/**
 * Convert linear volume to decibels
 * @param linear - Linear volume (0 to 1)
 * @returns Decibel value
 */
export const linearToDb = (linear: number): number => {
  if (linear <= 0) return -60; // Effectively silent
  return 20 * Math.log10(linear);
};

/**
 * Format dB value for display
 * @param dB - Decibel value
 * @returns Formatted string (e.g., "-10dB", "0dB", "-∞")
 */
export const formatDb = (dB: number): string => {
  if (dB <= -30) return '-∞';
  return `${dB > 0 ? '+' : ''}${Math.round(dB)}dB`;
};
