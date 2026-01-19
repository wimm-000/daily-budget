import { describe, it, expect, vi } from 'vitest'
import {
  getEffectiveStartDay,
  getPreviousMonth,
  calculateDailyBudget,
  sumAmounts,
  initializeDailyLog,
  setBudget,
  addExpense,
  deleteExpense,
  getDashboardData,
  type BudgetRepository,
  type User,
  type Budget,
  type DailyLog,
} from './budget.service'

// Mock repository factory
function createMockRepository(overrides: Partial<BudgetRepository> = {}): BudgetRepository {
  return {
    findUser: vi.fn().mockResolvedValue(null),
    findBudget: vi.fn().mockResolvedValue(null),
    createBudget: vi.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
    updateBudget: vi.fn().mockResolvedValue(undefined),
    findFixedExpenses: vi.fn().mockResolvedValue([]),
    findIncomes: vi.fn().mockResolvedValue([]),
    findDailyLog: vi.fn().mockResolvedValue(null),
    createDailyLog: vi.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
    updateDailyLog: vi.fn().mockResolvedValue(undefined),
    findExpenses: vi.fn().mockResolvedValue([]),
    createExpense: vi.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// Mock user factory
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'test@example.com',
    role: 'user',
    currency: 'EUR',
    monthStartDay: 1,
    ...overrides,
  }
}

// Mock budget factory
function createMockBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 1,
    userId: 1,
    monthlyAmount: 1000,
    month: 1,
    year: 2026,
    startDay: null,
    ...overrides,
  }
}

// Mock daily log factory
function createMockDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: 1,
    userId: 1,
    date: '2026-01-15',
    dailyBudget: 32.26,
    carryover: 0,
    totalSpent: 0,
    remaining: 32.26,
    ...overrides,
  }
}

describe('getEffectiveStartDay', () => {
  it('returns budget startDay when set', () => {
    expect(getEffectiveStartDay({ startDay: 15 }, 1)).toBe(15)
    expect(getEffectiveStartDay({ startDay: 28 }, 1)).toBe(28)
  })

  it('returns userStartDay when budget startDay is null', () => {
    expect(getEffectiveStartDay({ startDay: null }, 15)).toBe(15)
  })

  it('returns userStartDay when budget is null', () => {
    expect(getEffectiveStartDay(null, 10)).toBe(10)
  })

  it('returns userStartDay when budget is undefined', () => {
    expect(getEffectiveStartDay(undefined, 5)).toBe(5)
  })
})

describe('getPreviousMonth', () => {
  it('returns previous month within same year', () => {
    expect(getPreviousMonth(6, 2026)).toEqual({ month: 5, year: 2026 })
    expect(getPreviousMonth(12, 2026)).toEqual({ month: 11, year: 2026 })
  })

  it('handles year boundary', () => {
    expect(getPreviousMonth(1, 2026)).toEqual({ month: 12, year: 2025 })
  })
})

describe('calculateDailyBudget', () => {
  it('calculates basic daily budget', () => {
    expect(calculateDailyBudget(1000, 0, 0, 31)).toBeCloseTo(32.26, 1)
  })

  it('includes incomes', () => {
    expect(calculateDailyBudget(1000, 500, 0, 30)).toBe(50)
  })

  it('subtracts fixed expenses', () => {
    expect(calculateDailyBudget(1000, 0, 300, 35)).toBe(20)
  })

  it('returns 0 when expenses exceed budget', () => {
    expect(calculateDailyBudget(1000, 0, 1500, 30)).toBe(0)
  })
})

describe('sumAmounts', () => {
  it('sums amounts', () => {
    expect(sumAmounts([{ amount: 10 }, { amount: 20 }])).toBe(30)
  })

  it('returns 0 for empty array', () => {
    expect(sumAmounts([])).toBe(0)
  })
})

describe('initializeDailyLog', () => {
  it('creates new daily log when none exists', async () => {
    const repo = createMockRepository()
    
    const result = await initializeDailyLog(
      repo,
      1, // userId
      1000, // monthlyAmount
      0, // totalFixedExpenses
      0, // totalIncomes
      1, // month
      2026, // year
      1, // startDay
      '2026-01-15', // today
    )

    expect(repo.findDailyLog).toHaveBeenCalledWith(1, '2026-01-15')
    expect(repo.createDailyLog).toHaveBeenCalled()
    expect(result.dailyBudget).toBeCloseTo(32.26, 1)
    expect(result.carryover).toBe(0)
    expect(result.totalSpent).toBe(0)
  })

  it('carries over remaining from previous day in same period', async () => {
    const yesterdayLog = createMockDailyLog({
      date: '2026-01-14',
      remaining: 15.50,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockImplementation(async (_userId, date) => {
        if (date === '2026-01-14') return yesterdayLog
        return null
      }),
    })
    
    const result = await initializeDailyLog(
      repo,
      1,
      1000,
      0,
      0,
      1,
      2026,
      1,
      '2026-01-15',
    )

    expect(result.carryover).toBe(15.50)
    expect(result.remaining).toBeCloseTo(32.26 + 15.50, 1)
  })

  it('resets carryover at period boundary', async () => {
    // If startDay is 15 and today is Jan 15, yesterday (Jan 14) is in prev period
    const yesterdayLog = createMockDailyLog({
      date: '2026-01-14',
      remaining: 50,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockImplementation(async (_userId, date) => {
        if (date === '2026-01-14') return yesterdayLog
        return null
      }),
    })
    
    const result = await initializeDailyLog(
      repo,
      1,
      1000,
      0,
      0,
      1,
      2026,
      15, // startDay = 15, so Jan 14 is in December period
      '2026-01-15',
    )

    // Carryover should be reset because Jan 14 is in December period
    expect(result.carryover).toBe(0)
  })

  it('updates existing daily log with new daily budget', async () => {
    const existingLog = createMockDailyLog({
      dailyBudget: 30,
      carryover: 5,
      totalSpent: 10,
      remaining: 25,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockResolvedValue(existingLog),
    })
    
    const result = await initializeDailyLog(
      repo,
      1,
      1000,
      0,
      0,
      1,
      2026,
      1,
      '2026-01-15',
    )

    expect(repo.updateDailyLog).toHaveBeenCalledWith(
      existingLog.id,
      expect.objectContaining({
        dailyBudget: expect.any(Number),
        remaining: expect.any(Number),
      }),
    )
    // New remaining = new dailyBudget + carryover - totalSpent
    expect(result.remaining).toBeCloseTo(32.26 + 5 - 10, 1)
  })
})

describe('setBudget', () => {
  it('creates new budget when none exists', async () => {
    const repo = createMockRepository()
    
    const result = await setBudget(repo, 1, 1500, 2, 2026, null)

    expect(repo.findBudget).toHaveBeenCalledWith(1, 2, 2026)
    expect(repo.createBudget).toHaveBeenCalledWith({
      userId: 1,
      monthlyAmount: 1500,
      month: 2,
      year: 2026,
      startDay: null,
    })
    expect(result.monthlyAmount).toBe(1500)
  })

  it('updates existing budget', async () => {
    const existingBudget = createMockBudget({ monthlyAmount: 1000 })
    const repo = createMockRepository({
      findBudget: vi.fn().mockResolvedValue(existingBudget),
    })
    
    const result = await setBudget(repo, 1, 1500, 1, 2026, 15)

    expect(repo.updateBudget).toHaveBeenCalledWith(existingBudget.id, {
      monthlyAmount: 1500,
      startDay: 15,
    })
    expect(repo.createBudget).not.toHaveBeenCalled()
    expect(result.monthlyAmount).toBe(1500)
    expect(result.startDay).toBe(15)
  })
})

describe('addExpense', () => {
  it('creates expense and updates daily log', async () => {
    const dailyLog = createMockDailyLog({
      dailyBudget: 32,
      carryover: 0,
      totalSpent: 0,
      remaining: 32,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockResolvedValue(dailyLog),
    })
    
    const result = await addExpense(repo, 1, 15.50, 'Coffee', 'food', '2026-01-15')

    expect(repo.createExpense).toHaveBeenCalledWith({
      userId: 1,
      amount: 15.50,
      description: 'Coffee',
      category: 'food',
      date: '2026-01-15',
    })
    
    expect(repo.updateDailyLog).toHaveBeenCalledWith(dailyLog.id, {
      totalSpent: 15.50,
      remaining: 32 - 15.50,
    })
    
    expect(result.expense.amount).toBe(15.50)
    expect(result.dailyLog?.totalSpent).toBe(15.50)
    expect(result.dailyLog?.remaining).toBe(16.50)
  })

  it('accumulates spending on multiple expenses', async () => {
    const dailyLog = createMockDailyLog({
      dailyBudget: 32,
      carryover: 0,
      totalSpent: 10, // Already spent 10
      remaining: 22,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockResolvedValue(dailyLog),
    })
    
    const result = await addExpense(repo, 1, 5, 'Snack', 'food', '2026-01-15')

    expect(result.dailyLog?.totalSpent).toBe(15) // 10 + 5
    expect(result.dailyLog?.remaining).toBe(17) // 32 + 0 - 15
  })

  it('handles overspending (negative remaining)', async () => {
    const dailyLog = createMockDailyLog({
      dailyBudget: 32,
      carryover: 0,
      totalSpent: 30,
      remaining: 2,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockResolvedValue(dailyLog),
    })
    
    const result = await addExpense(repo, 1, 10, 'Lunch', 'food', '2026-01-15')

    expect(result.dailyLog?.totalSpent).toBe(40)
    expect(result.dailyLog?.remaining).toBe(-8) // Overspent
  })

  it('returns null dailyLog when no log exists', async () => {
    const repo = createMockRepository()
    
    const result = await addExpense(repo, 1, 15.50, 'Coffee', 'food', '2026-01-15')

    expect(result.expense).toBeDefined()
    expect(result.dailyLog).toBeNull()
  })
})

describe('deleteExpense', () => {
  it('deletes expense and updates daily log', async () => {
    const dailyLog = createMockDailyLog({
      dailyBudget: 32,
      carryover: 0,
      totalSpent: 20,
      remaining: 12,
    })

    const repo = createMockRepository({
      findDailyLog: vi.fn().mockResolvedValue(dailyLog),
    })
    
    const result = await deleteExpense(repo, 1, 5, 10, '2026-01-15')

    expect(repo.deleteExpense).toHaveBeenCalledWith(5)
    expect(repo.updateDailyLog).toHaveBeenCalledWith(dailyLog.id, {
      totalSpent: 10, // 20 - 10
      remaining: 22, // 32 + 0 - 10
    })
    
    expect(result?.totalSpent).toBe(10)
    expect(result?.remaining).toBe(22)
  })

  it('returns null when no daily log exists', async () => {
    const repo = createMockRepository()
    
    const result = await deleteExpense(repo, 1, 5, 10, '2026-01-15')

    expect(repo.deleteExpense).toHaveBeenCalledWith(5)
    expect(result).toBeNull()
  })
})

describe('getDashboardData', () => {
  it('returns dashboard data for current period', async () => {
    const user = createMockUser()
    const budget = createMockBudget({ monthlyAmount: 1000 })
    const fixedExpenses = [{ id: 1, userId: 1, name: 'Rent', amount: 300 }]
    const incomes = [{ id: 1, userId: 1, amount: 200, description: 'Bonus', month: 1, year: 2026 }]

    const repo = createMockRepository({
      findUser: vi.fn().mockResolvedValue(user),
      findBudget: vi.fn().mockResolvedValue(budget),
      findFixedExpenses: vi.fn().mockResolvedValue(fixedExpenses),
      findIncomes: vi.fn().mockResolvedValue(incomes),
    })
    
    const result = await getDashboardData(repo, 1, 1, 2026, '2026-01-15')

    expect(result.user).toEqual(user)
    expect(result.budget).toEqual(budget)
    expect(result.effectiveStartDay).toBe(1)
    expect(result.userStartDay).toBe(1)
    expect(result.totalFixedExpenses).toBe(300)
    expect(result.totalIncomes).toBe(200)
    // Daily budget = (1000 + 200 - 300) / 31 = 900 / 31 ≈ 29.03
    expect(result.dailyBudget).toBeCloseTo(29.03, 1)
  })

  it('uses budget startDay override when set', async () => {
    const user = createMockUser({ monthStartDay: 1 })
    const budget = createMockBudget({ startDay: 15 })

    const repo = createMockRepository({
      findUser: vi.fn().mockResolvedValue(user),
      findBudget: vi.fn().mockResolvedValue(budget),
    })
    
    const result = await getDashboardData(repo, 1, 1, 2026, '2026-01-20')

    expect(result.effectiveStartDay).toBe(15)
    expect(result.userStartDay).toBe(1)
  })

  it('throws error when user not found', async () => {
    const repo = createMockRepository()
    
    await expect(getDashboardData(repo, 999, 1, 2026)).rejects.toThrow('User not found')
  })

  it('returns zero daily budget when no budget exists', async () => {
    const user = createMockUser()

    const repo = createMockRepository({
      findUser: vi.fn().mockResolvedValue(user),
    })
    
    const result = await getDashboardData(repo, 1, 1, 2026, '2026-01-15')

    expect(result.budget).toBeNull()
    expect(result.dailyBudget).toBe(0)
  })

  it('determines current period from today when no month/year specified', async () => {
    const user = createMockUser({ monthStartDay: 28 })

    const repo = createMockRepository({
      findUser: vi.fn().mockResolvedValue(user),
    })
    
    // Jan 15 with startDay 28 means we're in "December 2025" period
    const result = await getDashboardData(repo, 1, undefined, undefined, '2026-01-15')

    // With startDay 28, Jan 15 is in the December 2025 period
    expect(result.period.month).toBe(12)
    expect(result.period.year).toBe(2025)
  })
})
