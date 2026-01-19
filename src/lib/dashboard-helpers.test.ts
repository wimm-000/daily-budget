import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCurrentMonth,
  getCurrentYear,
  getDaysInMonth,
  getPreviousMonth,
  getNextMonth,
  getEffectiveStartDay,
  calculateDailyBudget,
  calculateAvailableForDaily,
  formatCurrency,
  formatDate,
  formatMonthYear,
  calculateSpendingPercentage,
  calculateRemainingBudget,
  sumAmounts,
} from './dashboard-helpers'

describe('getCurrentMonth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current month (1-12)', () => {
    vi.setSystemTime(new Date('2026-01-15'))
    expect(getCurrentMonth()).toBe(1)

    vi.setSystemTime(new Date('2026-06-15'))
    expect(getCurrentMonth()).toBe(6)

    vi.setSystemTime(new Date('2026-12-15'))
    expect(getCurrentMonth()).toBe(12)
  })
})

describe('getCurrentYear', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns current year', () => {
    vi.setSystemTime(new Date('2026-01-15'))
    expect(getCurrentYear()).toBe(2026)

    vi.setSystemTime(new Date('2030-06-15'))
    expect(getCurrentYear()).toBe(2030)
  })
})

describe('getDaysInMonth', () => {
  it('returns correct days for 31-day months', () => {
    expect(getDaysInMonth(1, 2026)).toBe(31) // January
    expect(getDaysInMonth(3, 2026)).toBe(31) // March
    expect(getDaysInMonth(5, 2026)).toBe(31) // May
    expect(getDaysInMonth(7, 2026)).toBe(31) // July
    expect(getDaysInMonth(8, 2026)).toBe(31) // August
    expect(getDaysInMonth(10, 2026)).toBe(31) // October
    expect(getDaysInMonth(12, 2026)).toBe(31) // December
  })

  it('returns correct days for 30-day months', () => {
    expect(getDaysInMonth(4, 2026)).toBe(30) // April
    expect(getDaysInMonth(6, 2026)).toBe(30) // June
    expect(getDaysInMonth(9, 2026)).toBe(30) // September
    expect(getDaysInMonth(11, 2026)).toBe(30) // November
  })

  it('returns correct days for February (non-leap year)', () => {
    expect(getDaysInMonth(2, 2026)).toBe(28)
    expect(getDaysInMonth(2, 2025)).toBe(28)
    expect(getDaysInMonth(2, 2027)).toBe(28)
  })

  it('returns correct days for February (leap year)', () => {
    expect(getDaysInMonth(2, 2024)).toBe(29)
    expect(getDaysInMonth(2, 2028)).toBe(29)
    expect(getDaysInMonth(2, 2000)).toBe(29) // Century leap year
  })

  it('returns correct days for February (century non-leap year)', () => {
    expect(getDaysInMonth(2, 1900)).toBe(28)
    expect(getDaysInMonth(2, 2100)).toBe(28)
  })
})

describe('getPreviousMonth', () => {
  it('returns previous month within same year', () => {
    expect(getPreviousMonth(6, 2026)).toEqual({ month: 5, year: 2026 })
    expect(getPreviousMonth(12, 2026)).toEqual({ month: 11, year: 2026 })
    expect(getPreviousMonth(2, 2026)).toEqual({ month: 1, year: 2026 })
  })

  it('handles year boundary (January -> December)', () => {
    expect(getPreviousMonth(1, 2026)).toEqual({ month: 12, year: 2025 })
    expect(getPreviousMonth(1, 2000)).toEqual({ month: 12, year: 1999 })
  })
})

describe('getNextMonth', () => {
  it('returns next month within same year', () => {
    expect(getNextMonth(6, 2026)).toEqual({ month: 7, year: 2026 })
    expect(getNextMonth(1, 2026)).toEqual({ month: 2, year: 2026 })
    expect(getNextMonth(11, 2026)).toEqual({ month: 12, year: 2026 })
  })

  it('handles year boundary (December -> January)', () => {
    expect(getNextMonth(12, 2025)).toEqual({ month: 1, year: 2026 })
    expect(getNextMonth(12, 1999)).toEqual({ month: 1, year: 2000 })
  })
})

describe('getEffectiveStartDay', () => {
  it('returns budget startDay when set', () => {
    expect(getEffectiveStartDay({ startDay: 15 }, 1)).toBe(15)
    expect(getEffectiveStartDay({ startDay: 28 }, 1)).toBe(28)
  })

  it('returns userStartDay when budget startDay is null', () => {
    expect(getEffectiveStartDay({ startDay: null }, 15)).toBe(15)
    expect(getEffectiveStartDay({ startDay: null }, 28)).toBe(28)
  })

  it('returns userStartDay when budget is null', () => {
    expect(getEffectiveStartDay(null, 10)).toBe(10)
  })

  it('returns userStartDay when budget is undefined', () => {
    expect(getEffectiveStartDay(undefined, 5)).toBe(5)
  })
})

describe('calculateDailyBudget', () => {
  it('calculates basic daily budget', () => {
    // 1000 / 30 days = 33.33...
    expect(calculateDailyBudget(1000, 0, 0, 30)).toBeCloseTo(33.33, 1)
  })

  it('includes incomes in calculation', () => {
    // (1000 + 500) / 30 = 50
    expect(calculateDailyBudget(1000, 500, 0, 30)).toBe(50)
  })

  it('subtracts fixed expenses', () => {
    // (1000 - 300) / 30 = 23.33...
    expect(calculateDailyBudget(1000, 0, 300, 30)).toBeCloseTo(23.33, 1)
  })

  it('combines all factors', () => {
    // (1000 + 500 - 300) / 31 = 1200 / 31 = 38.71...
    expect(calculateDailyBudget(1000, 500, 300, 31)).toBeCloseTo(38.71, 1)
  })

  it('returns 0 when expenses exceed budget', () => {
    // (1000 + 0 - 1500) / 30 = -500 / 30 = negative, but max(0, ...) = 0
    expect(calculateDailyBudget(1000, 0, 1500, 30)).toBe(0)
  })
})

describe('calculateAvailableForDaily', () => {
  it('calculates simple budget', () => {
    expect(calculateAvailableForDaily(1000, 0, 0)).toBe(1000)
  })

  it('adds incomes', () => {
    expect(calculateAvailableForDaily(1000, 500, 0)).toBe(1500)
  })

  it('subtracts fixed expenses', () => {
    expect(calculateAvailableForDaily(1000, 0, 300)).toBe(700)
  })

  it('can return negative values', () => {
    expect(calculateAvailableForDaily(1000, 0, 1500)).toBe(-500)
  })
})

describe('formatCurrency', () => {
  it('formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR')
    // German locale uses comma as decimal separator
    expect(result).toContain('1.234,56')
    expect(result).toContain('€')
  })

  it('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toContain('1,234.56')
    expect(result).toContain('$')
  })

  it('defaults to EUR', () => {
    const result = formatCurrency(100)
    expect(result).toContain('€')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toContain('$0.00')
  })

  it('handles negative values', () => {
    const result = formatCurrency(-50, 'USD')
    expect(result).toContain('50.00')
    expect(result).toMatch(/-|\(/) // May use minus or parentheses
  })
})

describe('formatDate', () => {
  it('formats dates correctly', () => {
    const result = formatDate('2026-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  it('includes weekday', () => {
    // Jan 15, 2026 is a Thursday
    const result = formatDate('2026-01-15')
    expect(result).toContain('Thu')
  })

  it('handles month boundaries', () => {
    expect(formatDate('2026-12-31')).toContain('Dec')
    expect(formatDate('2026-12-31')).toContain('31')
  })
})

describe('formatMonthYear', () => {
  it('formats all months correctly', () => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    months.forEach((monthName, index) => {
      expect(formatMonthYear(index + 1, 2026)).toBe(`${monthName} 2026`)
    })
  })
})

describe('calculateSpendingPercentage', () => {
  it('calculates normal spending percentage', () => {
    const result = calculateSpendingPercentage(50, 100)
    expect(result.percent).toBe(50)
    expect(result.isOverspent).toBe(false)
  })

  it('handles 100% spending', () => {
    const result = calculateSpendingPercentage(100, 100)
    expect(result.percent).toBe(100)
    expect(result.isOverspent).toBe(false)
  })

  it('detects overspending', () => {
    const result = calculateSpendingPercentage(150, 100)
    expect(result.isOverspent).toBe(true)
    expect(result.percent).toBe(150)
  })

  it('caps percentage at 150%', () => {
    const result = calculateSpendingPercentage(300, 100)
    expect(result.percent).toBe(150)
    expect(result.isOverspent).toBe(true)
  })

  it('handles zero budget with spending', () => {
    const result = calculateSpendingPercentage(50, 0)
    expect(result.percent).toBe(100)
    expect(result.isOverspent).toBe(true)
  })

  it('handles zero budget with no spending', () => {
    const result = calculateSpendingPercentage(0, 0)
    expect(result.percent).toBe(0)
    expect(result.isOverspent).toBe(false)
  })
})

describe('calculateRemainingBudget', () => {
  it('calculates simple remaining budget', () => {
    expect(calculateRemainingBudget(100, 0, 30)).toBe(70)
  })

  it('includes positive carryover', () => {
    expect(calculateRemainingBudget(100, 20, 30)).toBe(90)
  })

  it('includes negative carryover (debt)', () => {
    expect(calculateRemainingBudget(100, -20, 30)).toBe(50)
  })

  it('can return negative (overspent)', () => {
    expect(calculateRemainingBudget(100, 0, 150)).toBe(-50)
  })
})

describe('sumAmounts', () => {
  it('sums array of amounts', () => {
    const items = [{ amount: 10 }, { amount: 20 }, { amount: 30 }]
    expect(sumAmounts(items)).toBe(60)
  })

  it('returns 0 for empty array', () => {
    expect(sumAmounts([])).toBe(0)
  })

  it('handles single item', () => {
    expect(sumAmounts([{ amount: 42 }])).toBe(42)
  })

  it('handles decimal amounts', () => {
    const items = [{ amount: 10.5 }, { amount: 20.25 }, { amount: 0.25 }]
    expect(sumAmounts(items)).toBe(31)
  })

  it('handles negative amounts', () => {
    const items = [{ amount: 100 }, { amount: -30 }]
    expect(sumAmounts(items)).toBe(70)
  })

  it('works with objects containing additional properties', () => {
    const items = [
      { id: 1, amount: 10, name: 'A' },
      { id: 2, amount: 20, name: 'B' },
    ]
    expect(sumAmounts(items)).toBe(30)
  })
})
