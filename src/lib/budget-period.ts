/**
 * Budget Period Utilities
 * 
 * Handles calculations for budget periods that may not align with calendar months.
 * For example, if a user gets paid on the 28th, their budget period runs from
 * the 28th of one month to the 27th of the next month.
 */

export type BudgetPeriod = {
  month: number        // The "label" month (1-12) - e.g., "January" budget
  year: number         // The "label" year
  startDate: string    // YYYY-MM-DD when the period starts
  endDate: string      // YYYY-MM-DD when the period ends
  daysInPeriod: number // Total days in this budget period
}

/**
 * Get the number of days in a specific month
 */
function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Get the effective start day for a given month, clamping to valid days
 * For example, if startDay is 30 but February only has 28 days,
 * this returns 28 (the last day of February)
 */
export function getEffectiveStartDay(startDay: number, month: number, year: number): number {
  const daysInMonth = getDaysInMonth(month, year)
  return Math.min(startDay, daysInMonth)
}

/**
 * Format a date as YYYY-MM-DD (local timezone, not UTC)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string to a Date (at midnight local time)
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the budget period for a given month/year label with a specific start day.
 * 
 * Example: getBudgetPeriod(1, 2026, 28) returns:
 * - month: 1 (January)
 * - year: 2026
 * - startDate: "2026-01-28"
 * - endDate: "2026-02-27"
 * - daysInPeriod: 31
 * 
 * If startDay is 1, the period is simply the calendar month.
 */
export function getBudgetPeriod(month: number, year: number, startDay: number = 1): BudgetPeriod {
  // Clamp startDay to valid day for the starting month
  const effectiveStartDay = getEffectiveStartDay(startDay, month, year)
  
  // Start date is day X of the given month
  const startDate = new Date(year, month - 1, effectiveStartDay)
  
  let endDate: Date
  
  if (startDay === 1) {
    // Standard calendar month: Jan 1 - Jan 31
    const lastDay = getDaysInMonth(month, year)
    endDate = new Date(year, month - 1, lastDay)
  } else {
    // Custom start day: period ends on (startDay - 1) of next month
    // e.g., start on 28th means end on 27th of next month
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    
    // Calculate the effective end day (startDay - 1, clamped to valid days)
    const targetEndDay = startDay - 1
    const effectiveEndDay = getEffectiveStartDay(targetEndDay, nextMonth, nextYear)
    
    endDate = new Date(nextYear, nextMonth - 1, effectiveEndDay)
  }
  
  // Calculate days in period
  const daysInPeriod = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  return {
    month,
    year,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    daysInPeriod,
  }
}

/**
 * Given a date string (YYYY-MM-DD) and a start day, determine which budget period it belongs to.
 * 
 * Example with startDay = 28:
 * - "2026-01-15" belongs to December 2025 period (Dec 28, 2025 - Jan 27, 2026)
 * - "2026-01-28" belongs to January 2026 period (Jan 28, 2026 - Feb 27, 2026)
 * - "2026-02-15" belongs to January 2026 period (Jan 28, 2026 - Feb 27, 2026)
 */
export function getBudgetPeriodForDate(dateStr: string, startDay: number = 1): { month: number; year: number } {
  const date = parseDate(dateStr)
  const dayOfMonth = date.getDate()
  let month = date.getMonth() + 1 // 1-12
  let year = date.getFullYear()
  
  if (startDay === 1) {
    // Standard calendar month - date is in its own month
    return { month, year }
  }
  
  // For custom start days:
  // If the day is >= startDay, the date is in the current calendar month's period
  // If the day is < startDay, the date is in the previous calendar month's period
  
  // Get the effective start day for the current calendar month
  const effectiveStartDayThisMonth = getEffectiveStartDay(startDay, month, year)
  
  if (dayOfMonth >= effectiveStartDayThisMonth) {
    // Date is on or after the start day - it's in this month's budget period
    return { month, year }
  } else {
    // Date is before the start day - it's in the previous month's budget period
    if (month === 1) {
      return { month: 12, year: year - 1 }
    }
    return { month: month - 1, year }
  }
}

/**
 * Check if a date string is within a budget period
 */
export function isDateInPeriod(dateStr: string, period: BudgetPeriod): boolean {
  return dateStr >= period.startDate && dateStr <= period.endDate
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the current budget period based on today's date and start day
 */
export function getCurrentBudgetPeriod(startDay: number = 1): BudgetPeriod {
  const today = getToday()
  const { month, year } = getBudgetPeriodForDate(today, startDay)
  return getBudgetPeriod(month, year, startDay)
}

/**
 * Get the previous budget period relative to a given period
 */
export function getPreviousPeriod(month: number, year: number, startDay: number = 1): BudgetPeriod {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return getBudgetPeriod(prevMonth, prevYear, startDay)
}

/**
 * Get the next budget period relative to a given period
 */
export function getNextPeriod(month: number, year: number, startDay: number = 1): BudgetPeriod {
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return getBudgetPeriod(nextMonth, nextYear, startDay)
}

/**
 * Check if a given period is the current period
 */
export function isCurrentPeriod(month: number, year: number, startDay: number = 1): boolean {
  const current = getCurrentBudgetPeriod(startDay)
  return current.month === month && current.year === year
}

/**
 * Check if a given period is in the future (hasn't started yet)
 */
export function isFuturePeriod(month: number, year: number, startDay: number = 1): boolean {
  const period = getBudgetPeriod(month, year, startDay)
  const today = getToday()
  return period.startDate > today
}

/**
 * Format a budget period for display
 * Returns "January 2026" if startDay is 1, otherwise "Jan 28 - Feb 27, 2026"
 * @param period - The budget period to format
 * @param startDay - The start day of the budget period (1 = calendar month)
 * @param locale - Locale for formatting (defaults to 'en-US')
 */
export function formatPeriodDisplay(period: BudgetPeriod, startDay: number = 1, locale: string = 'en-US'): string {
  if (startDay === 1) {
    const date = new Date(period.year, period.month - 1)
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }
  
  const startDate = parseDate(period.startDate)
  const endDate = parseDate(period.endDate)
  
  const startMonth = startDate.toLocaleDateString(locale, { month: 'short' })
  const startDayNum = startDate.getDate()
  const endMonth = endDate.toLocaleDateString(locale, { month: 'short' })
  const endDayNum = endDate.getDate()
  
  // Check if period spans two different years
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  
  if (startYear !== endYear) {
    return `${startMonth} ${startDayNum}, ${startYear} - ${endMonth} ${endDayNum}, ${endYear}`
  }
  
  return `${startMonth} ${startDayNum} - ${endMonth} ${endDayNum}, ${endYear}`
}

/**
 * Get yesterday's date string relative to a given date
 */
export function getYesterday(dateStr: string): string {
  const date = parseDate(dateStr)
  date.setDate(date.getDate() - 1)
  return formatDate(date)
}

/**
 * Check if two dates are in the same budget period
 */
export function areDatesInSamePeriod(date1: string, date2: string, startDay: number = 1): boolean {
  const period1 = getBudgetPeriodForDate(date1, startDay)
  const period2 = getBudgetPeriodForDate(date2, startDay)
  return period1.month === period2.month && period1.year === period2.year
}
