/**
 * Budget service - Business logic for budget operations
 * Extracted for testability with dependency injection
 */

import {
  getBudgetPeriod,
  getBudgetPeriodForDate,
  getToday,
  areDatesInSamePeriod,
  getYesterday,
} from '@/lib/budget-period'

// Types for dependencies
export type User = {
  id: number
  email: string
  role: 'user' | 'admin'
  currency: 'USD' | 'EUR'
  monthStartDay: number
}

export type Budget = {
  id: number
  userId: number
  monthlyAmount: number
  month: number
  year: number
  startDay: number | null
}

export type DailyLog = {
  id: number
  userId: number
  date: string
  dailyBudget: number
  carryover: number
  totalSpent: number
  remaining: number
}

export type FixedExpense = {
  id: number
  userId: number
  name: string
  amount: number
}

export type Income = {
  id: number
  userId: number
  amount: number
  description: string | null
  month: number
  year: number
}

export type Expense = {
  id: number
  userId: number
  amount: number
  description: string | null
  category: string
  date: string
}

// Repository interface for database operations
export interface BudgetRepository {
  findUser(userId: number): Promise<User | null>
  findBudget(userId: number, month: number, year: number): Promise<Budget | null>
  createBudget(data: Omit<Budget, 'id'>): Promise<Budget>
  updateBudget(id: number, data: Partial<Budget>): Promise<void>
  findFixedExpenses(userId: number): Promise<FixedExpense[]>
  findIncomes(userId: number, month: number, year: number): Promise<Income[]>
  findDailyLog(userId: number, date: string): Promise<DailyLog | null>
  createDailyLog(data: Omit<DailyLog, 'id'>): Promise<DailyLog>
  updateDailyLog(id: number, data: Partial<DailyLog>): Promise<void>
  findExpenses(userId: number, date: string): Promise<Expense[]>
  createExpense(data: Omit<Expense, 'id'>): Promise<Expense>
  deleteExpense(id: number): Promise<void>
}

/**
 * Get effective start day for a budget period
 * Budget-specific start day takes precedence over user default
 */
export function getEffectiveStartDay(
  budget: { startDay: number | null } | null | undefined,
  userStartDay: number,
): number {
  return budget?.startDay ?? userStartDay
}

/**
 * Get previous month/year
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
 * Sum amounts from a list of items
 */
export function sumAmounts<T extends { amount: number }>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

/**
 * Initialize or update daily log for a user
 */
export async function initializeDailyLog(
  repo: BudgetRepository,
  userId: number,
  monthlyAmount: number,
  totalFixedExpenses: number,
  totalIncomes: number,
  month: number,
  year: number,
  startDay: number = 1,
  today?: string,
): Promise<DailyLog> {
  const todayDate = today ?? getToday()
  
  // Get the budget period for this month with the specified start day
  const period = getBudgetPeriod(month, year, startDay)
  
  // Calculate daily budget
  const dailyBudget = calculateDailyBudget(
    monthlyAmount,
    totalIncomes,
    totalFixedExpenses,
    period.daysInPeriod,
  )

  // Check if today's log exists
  const existing = await repo.findDailyLog(userId, todayDate)

  if (!existing) {
    // Get yesterday's date
    const yesterdayStr = getYesterday(todayDate)
    
    // Check if yesterday was in the same budget period - if not, reset carryover
    const isSamePeriod = areDatesInSamePeriod(yesterdayStr, todayDate, startDay)

    let carryover = 0
    
    // Only carry over if within the same budget period
    if (isSamePeriod) {
      const yesterdayLog = await repo.findDailyLog(userId, yesterdayStr)
      carryover = yesterdayLog?.remaining ?? 0
    }

    return await repo.createDailyLog({
      userId,
      date: todayDate,
      dailyBudget,
      carryover,
      totalSpent: 0,
      remaining: dailyBudget + carryover,
    })
  } else {
    // Update existing log with new daily budget (in case fixed expenses changed)
    const newRemaining = dailyBudget + existing.carryover - existing.totalSpent
    await repo.updateDailyLog(existing.id, { dailyBudget, remaining: newRemaining })
    return { ...existing, dailyBudget, remaining: newRemaining }
  }
}

/**
 * Set or update budget for a user
 */
export async function setBudget(
  repo: BudgetRepository,
  userId: number,
  monthlyAmount: number,
  month: number,
  year: number,
  startDay: number | null = null,
): Promise<Budget> {
  const existing = await repo.findBudget(userId, month, year)

  if (existing) {
    await repo.updateBudget(existing.id, {
      monthlyAmount,
      startDay,
    })
    return { ...existing, monthlyAmount, startDay }
  } else {
    return await repo.createBudget({
      userId,
      monthlyAmount,
      month,
      year,
      startDay,
    })
  }
}

/**
 * Add an expense and update the daily log
 */
export async function addExpense(
  repo: BudgetRepository,
  userId: number,
  amount: number,
  description: string | null,
  category: string,
  date?: string,
): Promise<{ expense: Expense; dailyLog: DailyLog | null }> {
  const expenseDate = date ?? getToday()

  // Add expense
  const expense = await repo.createExpense({
    userId,
    amount,
    description,
    category,
    date: expenseDate,
  })

  // Update daily log
  const todayLog = await repo.findDailyLog(userId, expenseDate)

  if (todayLog) {
    const newTotalSpent = todayLog.totalSpent + amount
    const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

    await repo.updateDailyLog(todayLog.id, {
      totalSpent: newTotalSpent,
      remaining: newRemaining,
    })

    return {
      expense,
      dailyLog: { ...todayLog, totalSpent: newTotalSpent, remaining: newRemaining },
    }
  }

  return { expense, dailyLog: null }
}

/**
 * Delete an expense and update the daily log
 */
export async function deleteExpense(
  repo: BudgetRepository,
  userId: number,
  expenseId: number,
  expenseAmount: number,
  expenseDate: string,
): Promise<DailyLog | null> {
  // Delete expense
  await repo.deleteExpense(expenseId)

  // Update daily log
  const todayLog = await repo.findDailyLog(userId, expenseDate)

  if (todayLog) {
    const newTotalSpent = todayLog.totalSpent - expenseAmount
    const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

    await repo.updateDailyLog(todayLog.id, {
      totalSpent: newTotalSpent,
      remaining: newRemaining,
    })

    return { ...todayLog, totalSpent: newTotalSpent, remaining: newRemaining }
  }

  return null
}

/**
 * Get dashboard data for a user
 */
export async function getDashboardData(
  repo: BudgetRepository,
  userId: number,
  viewMonth?: number,
  viewYear?: number,
  today?: string,
): Promise<{
  user: User | null
  budget: Budget | null
  period: ReturnType<typeof getBudgetPeriod>
  effectiveStartDay: number
  userStartDay: number
  dailyBudget: number
  totalFixedExpenses: number
  totalIncomes: number
}> {
  const todayDate = today ?? getToday()
  
  // Get user
  const user = await repo.findUser(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // User's global start day
  const userStartDay = user.monthStartDay ?? 1
  
  // Determine which period to view
  let month: number
  let year: number
  
  if (viewMonth && viewYear) {
    month = viewMonth
    year = viewYear
  } else {
    const currentPeriod = getBudgetPeriodForDate(todayDate, userStartDay)
    month = currentPeriod.month
    year = currentPeriod.year
  }

  // Get budget
  const budget = await repo.findBudget(userId, month, year)
  
  // Effective start day
  const effectiveStartDay = getEffectiveStartDay(budget, userStartDay)
  
  // Get period boundaries
  const period = getBudgetPeriod(month, year, effectiveStartDay)

  // Get fixed expenses and incomes
  const fixedExpenses = await repo.findFixedExpenses(userId)
  const incomes = await repo.findIncomes(userId, month, year)

  const totalFixedExpenses = sumAmounts(fixedExpenses)
  const totalIncomes = sumAmounts(incomes)

  // Calculate daily budget
  const dailyBudget = budget
    ? calculateDailyBudget(
        budget.monthlyAmount,
        totalIncomes,
        totalFixedExpenses,
        period.daysInPeriod,
      )
    : 0

  return {
    user,
    budget,
    period,
    effectiveStartDay,
    userStartDay,
    dailyBudget,
    totalFixedExpenses,
    totalIncomes,
  }
}
