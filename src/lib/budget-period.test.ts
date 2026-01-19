import { describe, it, expect } from 'vitest'
import {
  getBudgetPeriod,
  getBudgetPeriodForDate,
  getEffectiveStartDay,
  formatPeriodDisplay,
  areDatesInSamePeriod,
  getYesterday,
} from './budget-period'

describe('getEffectiveStartDay', () => {
  it('returns the requested day for months with enough days', () => {
    // January has 31 days
    expect(getEffectiveStartDay(28, 1, 2026)).toBe(28)
    expect(getEffectiveStartDay(15, 1, 2026)).toBe(15)
    expect(getEffectiveStartDay(1, 1, 2026)).toBe(1)
  })

  it('clamps to last day for short months', () => {
    // February 2026 has 28 days (non-leap year)
    expect(getEffectiveStartDay(30, 2, 2026)).toBe(28)
    expect(getEffectiveStartDay(29, 2, 2026)).toBe(28)
    expect(getEffectiveStartDay(28, 2, 2026)).toBe(28)
    
    // February 2024 has 29 days (leap year)
    expect(getEffectiveStartDay(30, 2, 2024)).toBe(29)
    expect(getEffectiveStartDay(29, 2, 2024)).toBe(29)
  })
})

describe('getBudgetPeriod', () => {
  describe('with startDay = 1 (calendar month)', () => {
    it('returns the calendar month', () => {
      const period = getBudgetPeriod(1, 2026, 1)
      expect(period.month).toBe(1)
      expect(period.year).toBe(2026)
      expect(period.startDate).toBe('2026-01-01')
      expect(period.endDate).toBe('2026-01-31')
      expect(period.daysInPeriod).toBe(31)
    })

    it('handles February correctly', () => {
      const period = getBudgetPeriod(2, 2026, 1)
      expect(period.startDate).toBe('2026-02-01')
      expect(period.endDate).toBe('2026-02-28')
      expect(period.daysInPeriod).toBe(28)
    })

    it('handles leap year February', () => {
      const period = getBudgetPeriod(2, 2024, 1)
      expect(period.endDate).toBe('2024-02-29')
      expect(period.daysInPeriod).toBe(29)
    })
  })

  describe('with custom startDay', () => {
    it('returns period from day 28 of month to day 27 of next month', () => {
      const period = getBudgetPeriod(1, 2026, 28)
      expect(period.month).toBe(1)
      expect(period.year).toBe(2026)
      expect(period.startDate).toBe('2026-01-28')
      expect(period.endDate).toBe('2026-02-27')
      expect(period.daysInPeriod).toBe(31)
    })

    it('handles year boundary (December)', () => {
      const period = getBudgetPeriod(12, 2025, 28)
      expect(period.startDate).toBe('2025-12-28')
      expect(period.endDate).toBe('2026-01-27')
      expect(period.daysInPeriod).toBe(31)
    })

    it('clamps start day for short months', () => {
      // February 2026 has only 28 days, so start day 28 becomes Feb 28
      // End day would be 27th of March
      const period = getBudgetPeriod(2, 2026, 28)
      expect(period.startDate).toBe('2026-02-28')
      expect(period.endDate).toBe('2026-03-27')
    })
  })
})

describe('getBudgetPeriodForDate', () => {
  describe('with startDay = 1 (calendar month)', () => {
    it('returns the calendar month the date is in', () => {
      expect(getBudgetPeriodForDate('2026-01-15', 1)).toEqual({ month: 1, year: 2026 })
      expect(getBudgetPeriodForDate('2026-01-01', 1)).toEqual({ month: 1, year: 2026 })
      expect(getBudgetPeriodForDate('2026-01-31', 1)).toEqual({ month: 1, year: 2026 })
    })
  })

  describe('with custom startDay = 28', () => {
    it('date on or after start day belongs to current month period', () => {
      // Jan 28 is in "January" period (Jan 28 - Feb 27)
      expect(getBudgetPeriodForDate('2026-01-28', 28)).toEqual({ month: 1, year: 2026 })
      expect(getBudgetPeriodForDate('2026-01-29', 28)).toEqual({ month: 1, year: 2026 })
      expect(getBudgetPeriodForDate('2026-01-31', 28)).toEqual({ month: 1, year: 2026 })
    })

    it('date before start day belongs to previous month period', () => {
      // Jan 15 is in "December 2025" period (Dec 28, 2025 - Jan 27, 2026)
      expect(getBudgetPeriodForDate('2026-01-15', 28)).toEqual({ month: 12, year: 2025 })
      expect(getBudgetPeriodForDate('2026-01-01', 28)).toEqual({ month: 12, year: 2025 })
      expect(getBudgetPeriodForDate('2026-01-27', 28)).toEqual({ month: 12, year: 2025 })
    })

    it('handles dates in the middle of a period spanning two months', () => {
      // Feb 15 is in "January 2026" period (Jan 28 - Feb 27)
      expect(getBudgetPeriodForDate('2026-02-15', 28)).toEqual({ month: 1, year: 2026 })
      expect(getBudgetPeriodForDate('2026-02-27', 28)).toEqual({ month: 1, year: 2026 })
      // Feb 28 starts "February" period
      expect(getBudgetPeriodForDate('2026-02-28', 28)).toEqual({ month: 2, year: 2026 })
    })

    it('handles year boundaries', () => {
      // Dec 28, 2025 is in "December 2025" period
      expect(getBudgetPeriodForDate('2025-12-28', 28)).toEqual({ month: 12, year: 2025 })
      // Dec 27, 2025 is in "November 2025" period
      expect(getBudgetPeriodForDate('2025-12-27', 28)).toEqual({ month: 11, year: 2025 })
    })
  })
})

describe('areDatesInSamePeriod', () => {
  it('returns true for dates in same calendar month with startDay = 1', () => {
    expect(areDatesInSamePeriod('2026-01-01', '2026-01-31', 1)).toBe(true)
    expect(areDatesInSamePeriod('2026-01-15', '2026-01-20', 1)).toBe(true)
  })

  it('returns false for dates in different calendar months with startDay = 1', () => {
    expect(areDatesInSamePeriod('2026-01-31', '2026-02-01', 1)).toBe(false)
  })

  it('returns true for dates in same period with custom startDay', () => {
    // Both in "January 2026" period (Jan 28 - Feb 27)
    expect(areDatesInSamePeriod('2026-01-28', '2026-02-15', 28)).toBe(true)
    expect(areDatesInSamePeriod('2026-01-28', '2026-02-27', 28)).toBe(true)
  })

  it('returns false for dates in different periods with custom startDay', () => {
    // Jan 27 is in "December 2025" period, Jan 28 is in "January 2026" period
    expect(areDatesInSamePeriod('2026-01-27', '2026-01-28', 28)).toBe(false)
    // Feb 27 is in "January" period, Feb 28 is in "February" period
    expect(areDatesInSamePeriod('2026-02-27', '2026-02-28', 28)).toBe(false)
  })
})

describe('getYesterday', () => {
  it('returns the previous day', () => {
    expect(getYesterday('2026-01-15')).toBe('2026-01-14')
    expect(getYesterday('2026-01-01')).toBe('2025-12-31')
    expect(getYesterday('2026-03-01')).toBe('2026-02-28')
  })
})

describe('formatPeriodDisplay', () => {
  it('returns month name for startDay = 1', () => {
    const period = getBudgetPeriod(1, 2026, 1)
    expect(formatPeriodDisplay(period, 1)).toBe('January 2026')
  })

  it('returns date range for custom startDay', () => {
    const period = getBudgetPeriod(1, 2026, 28)
    expect(formatPeriodDisplay(period, 28)).toBe('Jan 28 - Feb 27, 2026')
  })

  it('handles year boundary in format', () => {
    const period = getBudgetPeriod(12, 2025, 28)
    expect(formatPeriodDisplay(period, 28)).toBe('Dec 28, 2025 - Jan 27, 2026')
  })
})
