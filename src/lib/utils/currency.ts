/**
 * Currency Configuration and Formatting Utilities
 *
 * This module provides a centralized way to handle currency formatting
 * across the entire application with configurable currency support.
 */

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CZK' | 'PLN';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  locale: string;
  position: 'before' | 'after';
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', position: 'after' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', position: 'before' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', position: 'before' },
  CZK: { code: 'CZK', symbol: 'Kč', locale: 'cs-CZ', position: 'after' },
  PLN: { code: 'PLN', symbol: 'zł', locale: 'pl-PL', position: 'after' },
};

// Default currency - can be changed via settings
let currentCurrency: Currency = 'EUR';

/**
 * Get the current currency setting
 */
export function getCurrency(): Currency {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app-currency');
    if (saved && saved in CURRENCIES) {
      currentCurrency = saved as Currency;
    }
  }
  return currentCurrency;
}

/**
 * Set the currency preference
 */
export function setCurrency(currency: Currency): void {
  currentCurrency = currency;
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-currency', currency);
  }
}

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency?: Currency): CurrencyConfig {
  return CURRENCIES[currency || getCurrency()];
}

/**
 * Format a number as currency (always 2 decimal places)
 *
 * Examples:
 * - 0.04 → "0.04 €" (EUR)
 * - 0.134 → "0.13 €" (EUR)
 * - 1.50 → "1.50 €" (EUR)
 * - 52.829 → "52.83 €" (EUR)
 * - 0.001 → "< 0.01 €" (EUR)
 */
export function formatPrice(amount: number, currency?: Currency): string {
  const config = getCurrencyConfig(currency);

  if (amount === 0) {
    return config.position === 'before'
      ? `${config.symbol}0.00`
      : `0.00 ${config.symbol}`;
  }

  if (amount < 0.01) {
    return config.position === 'before'
      ? `< ${config.symbol}0.01`
      : `< 0.01 ${config.symbol}`;
  }

  // Always format with 2 decimal places
  const formatted = amount.toFixed(2);

  return config.position === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

/**
 * Format price for compact display (e.g., in badges, buttons)
 * Shows just the number and symbol in a clean way
 *
 * Examples:
 * - 0.04 → "0.04"
 * - 0.134 → "0.13"
 * - 52.829 → "52.83"
 * - 0 → "Free"
 */
export function formatPriceCompact(amount: number): string {
  if (amount === 0) return 'Free';
  if (amount < 0.01) return '< 0.01';
  return amount.toFixed(2);
}

/**
 * Format price with currency symbol for compact display
 */
export function formatPriceWithSymbol(amount: number, currency?: Currency): string {
  const config = getCurrencyConfig(currency);
  const formatted = formatPriceCompact(amount);

  if (formatted === 'Free') return formatted;

  return config.position === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

/**
 * Get just the currency symbol
 */
export function getCurrencySymbol(currency?: Currency): string {
  return getCurrencyConfig(currency).symbol;
}

/**
 * Hook-friendly currency state initializer
 * Call this in useEffect to sync with localStorage
 */
export function initializeCurrency(): Currency {
  return getCurrency();
}
