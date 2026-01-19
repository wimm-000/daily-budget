import { describe, it, expect } from 'vitest'
import {
  getBudgetPeriod,
  getBudgetPeriodForDate,
  getEffectiveStartDay,
  formatPeriodDisplay,
  areDatesInSamePeriod,
  getYesterday,
  isDateInPeriod,
  getPreviousPeriod,
  getNextPeriod,
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

  it('handles April, June, September, November (30 days)', () => {
    expect(getEffectiveStartDay(31, 4, 2026)).toBe(30)
    expect(getEffectiveStartDay(31, 6, 2026)).toBe(30)
    expect(getEffectiveStartDay(31, 9, 2026)).toBe(30)
    expect(getEffectiveStartDay(31, 11, 2026)).toBe(30)
    expect(getEffectiveStartDay(30, 4, 2026)).toBe(30)
  })

  it('handles 31-day months without clamping', () => {
    expect(getEffectiveStartDay(31, 1, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 3, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 5, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 7, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 8, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 10, 2026)).toBe(31)
    expect(getEffectiveStartDay(31, 12, 2026)).toBe(31)
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

  it('formats all months correctly for startDay = 1', () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    months.forEach((monthName, index) => {
      const period = getBudgetPeriod(index + 1, 2026, 1)
      expect(formatPeriodDisplay(period, 1)).toBe(`${monthName} 2026`)
    })
  })
})

describe('isDateInPeriod', () => {
  it('returns true for dates within the period', () => {
    const period = getBudgetPeriod(1, 2026, 1) // Jan 1 - Jan 31
    expect(isDateInPeriod('2026-01-01', period)).toBe(true)
    expect(isDateInPeriod('2026-01-15', period)).toBe(true)
    expect(isDateInPeriod('2026-01-31', period)).toBe(true)
  })

  it('returns false for dates outside the period', () => {
    const period = getBudgetPeriod(1, 2026, 1) // Jan 1 - Jan 31
    expect(isDateInPeriod('2025-12-31', period)).toBe(false)
    expect(isDateInPeriod('2026-02-01', period)).toBe(false)
    expect(isDateInPeriod('2026-06-15', period)).toBe(false)
  })

  it('works with custom startDay periods', () => {
    const period = getBudgetPeriod(1, 2026, 28) // Jan 28 - Feb 27
    expect(isDateInPeriod('2026-01-27', period)).toBe(false) // Before period
    expect(isDateInPeriod('2026-01-28', period)).toBe(true)  // Start of period
    expect(isDateInPeriod('2026-02-15', period)).toBe(true)  // Middle of period
    expect(isDateInPeriod('2026-02-27', period)).toBe(true)  // End of period
    expect(isDateInPeriod('2026-02-28', period)).toBe(false) // After period
  })
})

describe('getPreviousPeriod', () => {
  it('returns previous month for mid-year months', () => {
    const prev = getPreviousPeriod(6, 2026, 1)
    expect(prev.month).toBe(5)
    expect(prev.year).toBe(2026)
    expect(prev.startDate).toBe('2026-05-01')
  })

  it('handles year boundary (January -> December)', () => {
    const prev = getPreviousPeriod(1, 2026, 1)
    expect(prev.month).toBe(12)
    expect(prev.year).toBe(2025)
    expect(prev.startDate).toBe('2025-12-01')
    expect(prev.endDate).toBe('2025-12-31')
  })

  it('works with custom startDay', () => {
    const prev = getPreviousPeriod(3, 2026, 28)
    expect(prev.month).toBe(2)
    expect(prev.year).toBe(2026)
    expect(prev.startDate).toBe('2026-02-28')
    expect(prev.endDate).toBe('2026-03-27')
  })

  it('handles year boundary with custom startDay', () => {
    const prev = getPreviousPeriod(1, 2026, 28)
    expect(prev.month).toBe(12)
    expect(prev.year).toBe(2025)
    expect(prev.startDate).toBe('2025-12-28')
    expect(prev.endDate).toBe('2026-01-27')
  })
})

describe('getNextPeriod', () => {
  it('returns next month for mid-year months', () => {
    const next = getNextPeriod(6, 2026, 1)
    expect(next.month).toBe(7)
    expect(next.year).toBe(2026)
    expect(next.startDate).toBe('2026-07-01')
  })

  it('handles year boundary (December -> January)', () => {
    const next = getNextPeriod(12, 2025, 1)
    expect(next.month).toBe(1)
    expect(next.year).toBe(2026)
    expect(next.startDate).toBe('2026-01-01')
    expect(next.endDate).toBe('2026-01-31')
  })

  it('works with custom startDay', () => {
    const next = getNextPeriod(1, 2026, 28)
    expect(next.month).toBe(2)
    expect(next.year).toBe(2026)
    expect(next.startDate).toBe('2026-02-28')
  })

  it('handles year boundary with custom startDay', () => {
    const next = getNextPeriod(12, 2025, 28)
    expect(next.month).toBe(1)
    expect(next.year).toBe(2026)
    expect(next.startDate).toBe('2026-01-28')
    expect(next.endDate).toBe('2026-02-27')
  })
})

describe('edge cases', () => {
  it('handles leap year transitions', () => {
    // Period spanning Feb 29 in a leap year
    const period = getBudgetPeriod(2, 2024, 15)
    expect(period.startDate).toBe('2024-02-15')
    expect(period.endDate).toBe('2024-03-14')
    expect(period.daysInPeriod).toBe(29) // Feb 15-29 (15 days) + Mar 1-14 (14 days) = 29
  })

  it('handles non-leap year February', () => {
    const period = getBudgetPeriod(2, 2026, 15)
    expect(period.startDate).toBe('2026-02-15')
    expect(period.endDate).toBe('2026-03-14')
    expect(period.daysInPeriod).toBe(28) // Feb 15-28 (14 days) + Mar 1-14 (14 days) = 28
  })

  it('handles startDay = 1 consistently across all months', () => {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for (let month = 1; month <= 12; month++) {
      const period = getBudgetPeriod(month, 2026, 1)
      expect(period.daysInPeriod).toBe(daysInMonths[month - 1])
    }
  })

  it('getYesterday handles month boundaries', () => {
    expect(getYesterday('2026-02-01')).toBe('2026-01-31')
    expect(getYesterday('2026-03-01')).toBe('2026-02-28')
    expect(getYesterday('2024-03-01')).toBe('2024-02-29') // Leap year
    expect(getYesterday('2026-05-01')).toBe('2026-04-30')
  })

  it('getYesterday handles year boundary', () => {
    expect(getYesterday('2026-01-01')).toBe('2025-12-31')
  })

  it('areDatesInSamePeriod handles edge cases at period boundaries', () => {
    // Last day of period and first day of next period
    expect(areDatesInSamePeriod('2026-01-31', '2026-02-01', 1)).toBe(false)
    
    // Same day should always be in same period
    expect(areDatesInSamePeriod('2026-01-15', '2026-01-15', 1)).toBe(true)
    expect(areDatesInSamePeriod('2026-01-28', '2026-01-28', 28)).toBe(true)
  })
})
