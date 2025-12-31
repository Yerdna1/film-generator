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
 * Format a number as currency (clean format without trailing zeros)
 *
 * Examples:
 * - 0.04 → "0.04 €" (EUR)
 * - 0.134 → "0.13 €" (EUR)
 * - 1.50 → "1.50 €" (EUR)
 * - 0.001 → "< 0.01 €" (EUR)
 */
export function formatPrice(amount: number, currency?: Currency): string {
  const config = getCurrencyConfig(currency);

  if (amount === 0) {
    return config.position === 'before'
      ? `${config.symbol}0`
      : `0 ${config.symbol}`;
  }

  if (amount < 0.01) {
    return config.position === 'before'
      ? `< ${config.symbol}0.01`
      : `< 0.01 ${config.symbol}`;
  }

  // Format with appropriate decimal places (2-3 based on amount)
  let formatted: string;
  if (amount < 0.1) {
    // For small amounts, show up to 3 decimals but remove trailing zeros
    formatted = amount.toFixed(3).replace(/\.?0+$/, '');
    // Ensure at least 2 decimal places
    if (!formatted.includes('.')) {
      formatted += '.00';
    } else if (formatted.split('.')[1]?.length === 1) {
      formatted += '0';
    }
  } else {
    formatted = amount.toFixed(2);
  }

  // Remove unnecessary trailing zeros but keep at least 2 decimal places
  const parts = formatted.split('.');
  if (parts[1] && parts[1].length > 2) {
    formatted = parseFloat(formatted).toFixed(2);
  }

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
 * - 0 → "Free"
 */
export function formatPriceCompact(amount: number): string {
  if (amount === 0) return 'Free';
  if (amount < 0.001) return '< 0.001';

  // Remove trailing zeros
  if (amount < 0.01) return amount.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (amount < 1) return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
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
