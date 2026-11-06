import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numeric value to Philippine Peso (PHP) with 2 decimal places.
 */
export function formatPHP(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format Date string (YYYY-MM-DD) to friendly format: "Oct 27, 2026"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const sDate = dateString.split('T')[0];
    const [year, month, day] = sDate.split('-').map(Number);
    if (!year || !month || !day) return dateString;

    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats raw payment terms code to display string.
 */
export function formatPayTerms(terms: string | null | undefined): string {
  if (!terms) return 'Net 30';
  return terms.trim();
}

export function formatTenure(days: number | null | undefined): string {
  if (days === null || days === undefined || days < 0) return '0 days';
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const leftoverDays = remainingDays % 30;

  if (years > 0) {
    return `${years} yr${years > 1 ? 's' : ''}${months > 0 ? `, ${months} mo${months > 1 ? 's' : ''}` : ''}`;
  }
  if (months > 0) {
    return `${months} mo${months > 1 ? 's' : ''}${leftoverDays > 0 ? `, ${leftoverDays} d` : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}
