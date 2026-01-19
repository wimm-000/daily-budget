/**
 * Dashboard helper functions for calculations and formatting
 */

/**
 * Get the current month (1-12)
 */
export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get the number of days in a specific month
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Get the previous month and year
 */
export function getPreviousMonth(
  month: number,
  year: number,
): { month: number; year: number } {
  if (month === 1) {
    return { month: 12, year: year - 1 }
  }
  return { month: month - 1, year }
}

/**
 * Get the next month and year
 */
export function getNextMonth(
  month: number,
  year: number,
): { month: number; year: number } {
  if (month === 12) {
    return { month: 1, year: year + 1 }
  }
  return { month: month + 1, year }
}

/**
 * Get the effective start day for a budget period
 * Budget-specific start day takes precedence over user default
 */
export function getEffectiveStartDay(
  budget: { startDay: number | null } | null | undefined,
  userStartDay: number,
): number {
  return budget?.startDay ?? userStartDay
}

/**
 * Calculate daily budget from monthly amounts
 */
export function calculateDailyBudget(
  monthlyAmount: number,
  totalIncomes: number,
  totalFixedExpenses: number,
  daysInPeriod: number,
): number {
  const availableForDaily = monthlyAmount + totalIncomes - totalFixedExpenses
  return Math.max(0, availableForDaily / daysInPeriod)
}

/**
 * Calculate available budget for daily spending
 */
export function calculateAvailableForDaily(
  monthlyAmount: number,
  totalIncomes: number,
  totalFixedExpenses: number,
): number {
  return monthlyAmount + totalIncomes - totalFixedExpenses
}

/**
 * Format a currency amount using Intl.NumberFormat
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'EUR' = 'EUR',
): string {
  const locale = currency === 'EUR' ? 'de-DE' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format a date string (YYYY-MM-DD) for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format month and year for display (e.g., "January 2026")
 */
export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Calculate spending percentage for progress display
 */
export function calculateSpendingPercentage(
  spent: number,
  totalBudget: number,
): { percent: number; isOverspent: boolean } {
  if (totalBudget <= 0) {
    return { percent: spent > 0 ? 100 : 0, isOverspent: spent > 0 }
  }

  const percent = (spent / totalBudget) * 100
  const isOverspent = spent > totalBudget

  return { percent: Math.min(percent, 150), isOverspent }
}

/**
 * Calculate remaining budget for the day
 */
export function calculateRemainingBudget(
  dailyBudget: number,
  carryover: number,
  totalSpent: number,
): number {
  return dailyBudget + carryover - totalSpent
}

/**
 * Sum amounts from an array of objects with an amount property
 */
export function sumAmounts<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}
