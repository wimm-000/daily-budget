import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { eq, and, desc } from 'drizzle-orm'

import { db } from '@/db'
import { budgets, expenses, dailyLogs, users, fixedExpenses, incomes } from '@/db/schema'
import { getSession } from '@/lib/session'
import {
  getBudgetPeriod,
  getBudgetPeriodForDate,
  getToday as getTodayFromLib,
  areDatesInSamePeriod,
  isCurrentPeriod,
  getYesterday,
} from '@/lib/budget-period'
import {
  getCurrentMonth,
  getCurrentYear,
  getPreviousMonth,
  getEffectiveStartDay,
} from '@/lib/dashboard-helpers'
import {
  setBudgetSchema,
  addExpenseSchema,
  addFixedExpenseSchema,
  addIncomeSchema,
  updateMonthStartDaySchema,
  updateCurrencySchema,
  type SetBudgetInput,
  type AddExpenseInput,
  type AddFixedExpenseInput,
  type AddIncomeInput,
  type UpdateMonthStartDayInput,
  type UpdateCurrencyInput,
} from '@/lib/validations'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper wrapper for getToday (used throughout server functions)
 */
function getToday() {
  return getTodayFromLib()
}

/**
 * Initialize or update a daily log for the current day
 */
async function initializeDailyLog(
  userId: number,
  monthlyAmount: number,
  totalFixedExpenses: number,
  totalIncomes: number,
  month: number,
  year: number,
  startDay: number = 1
) {
  const today = getToday()
  const period = getBudgetPeriod(month, year, startDay)
  const availableForDaily = monthlyAmount + totalIncomes - totalFixedExpenses
  const dailyBudget = Math.max(0, availableForDaily / period.daysInPeriod)

  const existing = await db.query.dailyLogs.findFirst({
    where: and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)),
  })

  if (!existing) {
    const yesterdayStr = getYesterday(today)
    const isSamePeriod = areDatesInSamePeriod(yesterdayStr, today, startDay)

    let carryover = 0
    if (isSamePeriod) {
      const yesterdayLog = await db.query.dailyLogs.findFirst({
        where: and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, yesterdayStr)),
      })
      carryover = yesterdayLog?.remaining ?? 0
    }

    await db.insert(dailyLogs).values({
      userId,
      date: today,
      dailyBudget,
      carryover,
      totalSpent: 0,
      remaining: dailyBudget + carryover,
    })
  } else {
    const newRemaining = dailyBudget + existing.carryover - existing.totalSpent
    await db
      .update(dailyLogs)
      .set({ dailyBudget, remaining: newRemaining })
      .where(eq(dailyLogs.id, existing.id))
  }
}

// =============================================================================
// Server Functions
// =============================================================================

/**
 * Get all dashboard data for a given month/year
 */
export const getDashboardData = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { viewMonth?: number; viewYear?: number }) => data)
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/' })
    }

    const today = getToday()

    // Get user with currency preference and monthStartDay setting
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    })

    // User's global start day (default to 1 if not set)
    const userStartDay = user?.monthStartDay ?? 1

    // Determine which period we should view
    let viewMonth: number
    let viewYear: number

    if (data?.viewMonth && data?.viewYear) {
      viewMonth = data.viewMonth
      viewYear = data.viewYear
    } else {
      // Determine current period from today's date
      const currentPeriod = getBudgetPeriodForDate(today, userStartDay)
      viewMonth = currentPeriod.month
      viewYear = currentPeriod.year
    }

    // Get viewed month's budget
    let budget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, session.id),
        eq(budgets.month, viewMonth),
        eq(budgets.year, viewYear)
      ),
    })

    // Effective start day for this period (budget override or user default)
    const effectiveStartDay = getEffectiveStartDay(budget, userStartDay)

    // Get the budget period boundaries
    const period = getBudgetPeriod(viewMonth, viewYear, effectiveStartDay)

    // Check if we're viewing the current period
    const viewingCurrentPeriod = isCurrentPeriod(viewMonth, viewYear, effectiveStartDay)

    // Track if budget was copied from previous month
    let budgetCopiedFromPreviousMonth = false

    // Only auto-copy budget when viewing current period
    if (!budget && viewingCurrentPeriod) {
      const prev = getPreviousMonth(viewMonth, viewYear)
      const previousBudget = await db.query.budgets.findFirst({
        where: and(
          eq(budgets.userId, session.id),
          eq(budgets.month, prev.month),
          eq(budgets.year, prev.year)
        ),
      })

      if (previousBudget) {
        const [newBudget] = await db
          .insert(budgets)
          .values({
            userId: session.id,
            monthlyAmount: previousBudget.monthlyAmount,
            month: viewMonth,
            year: viewYear,
            startDay: null,
          })
          .returning()

        budget = newBudget
        budgetCopiedFromPreviousMonth = true
      }
    }

    // Get fixed expenses (these persist across months)
    const userFixedExpenses = await db.query.fixedExpenses.findMany({
      where: eq(fixedExpenses.userId, session.id),
      orderBy: [desc(fixedExpenses.createdAt)],
    })

    // Get this period's incomes (NOT copied from previous month)
    const monthIncomes = await db.query.incomes.findMany({
      where: and(
        eq(incomes.userId, session.id),
        eq(incomes.month, viewMonth),
        eq(incomes.year, viewYear)
      ),
      orderBy: [desc(incomes.createdAt)],
    })

    // Calculate totals
    const totalFixedExpenses = userFixedExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalIncomes = monthIncomes.reduce((sum, i) => sum + i.amount, 0)

    // Initialize today's log if we have a budget but no log for today (only for current period)
    if (budget && viewingCurrentPeriod) {
      const existingLog = await db.query.dailyLogs.findFirst({
        where: and(eq(dailyLogs.userId, session.id), eq(dailyLogs.date, today)),
      })

      if (!existingLog) {
        await initializeDailyLog(
          session.id,
          budget.monthlyAmount,
          totalFixedExpenses,
          totalIncomes,
          viewMonth,
          viewYear,
          effectiveStartDay
        )
      }
    }

    // Get today's log (may have just been created)
    const todayLog = viewingCurrentPeriod
      ? await db.query.dailyLogs.findFirst({
          where: and(eq(dailyLogs.userId, session.id), eq(dailyLogs.date, today)),
        })
      : null

    // Get today's expenses (only for current period view)
    const todayExpenses = viewingCurrentPeriod
      ? await db.query.expenses.findMany({
          where: and(eq(expenses.userId, session.id), eq(expenses.date, today)),
          orderBy: [desc(expenses.createdAt)],
        })
      : []

    // Get daily logs for the viewed period
    const startOfCalendarMonth = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`
    const daysInCalendarMonth = new Date(viewYear, viewMonth, 0).getDate()
    const endOfCalendarMonth = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(daysInCalendarMonth).padStart(2, '0')}`

    const recentLogs = await db.query.dailyLogs.findMany({
      where: eq(dailyLogs.userId, session.id),
      orderBy: [desc(dailyLogs.date)],
      limit: 62,
    })

    const filteredLogs = recentLogs.filter((log) => {
      return log.date >= startOfCalendarMonth && log.date <= endOfCalendarMonth
    })

    // Get all expenses for the viewed month
    const allExpenses = await db.query.expenses.findMany({
      where: eq(expenses.userId, session.id),
      orderBy: [desc(expenses.date), desc(expenses.createdAt)],
    })

    const filteredMonthExpenses = allExpenses.filter((exp) => {
      return exp.date >= startOfCalendarMonth && exp.date <= endOfCalendarMonth
    })

    return {
      user,
      budget,
      budgetCopiedFromPreviousMonth,
      fixedExpenses: userFixedExpenses,
      incomes: monthIncomes,
      totalFixedExpenses,
      totalIncomes,
      todayLog,
      todayExpenses,
      recentLogs: filteredLogs,
      monthExpenses: filteredMonthExpenses,
      today,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: viewingCurrentPeriod,
      period,
      effectiveStartDay,
      userStartDay,
    }
  })

/**
 * Set or update a monthly budget
 */
export const setBudget = createServerFn({
  method: 'POST',
})
  .inputValidator((data: SetBudgetInput) => setBudgetSchema.parse(data))
  .handler(async ({ data }: { data: SetBudgetInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.id),
    })
    const userStartDay = user?.monthStartDay ?? 1

    const existing = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, session.id),
        eq(budgets.month, data.month),
        eq(budgets.year, data.year)
      ),
    })

    const effectiveStartDay = data.startDay ?? userStartDay

    if (existing) {
      await db
        .update(budgets)
        .set({
          monthlyAmount: data.monthlyAmount,
          startDay: data.startDay ?? null,
        })
        .where(eq(budgets.id, existing.id))
    } else {
      await db.insert(budgets).values({
        userId: session.id,
        monthlyAmount: data.monthlyAmount,
        month: data.month,
        year: data.year,
        startDay: data.startDay ?? null,
      })
    }

    const userFixedExpenses = await db.query.fixedExpenses.findMany({
      where: eq(fixedExpenses.userId, session.id),
    })
    const totalFixed = userFixedExpenses.reduce((sum, e) => sum + e.amount, 0)

    const monthIncomes = await db.query.incomes.findMany({
      where: and(
        eq(incomes.userId, session.id),
        eq(incomes.month, data.month),
        eq(incomes.year, data.year)
      ),
    })
    const totalIncomes = monthIncomes.reduce((sum, i) => sum + i.amount, 0)

    await initializeDailyLog(
      session.id,
      data.monthlyAmount,
      totalFixed,
      totalIncomes,
      data.month,
      data.year,
      effectiveStartDay
    )

    return { success: true }
  })

/**
 * Add an expense for today
 */
export const addExpense = createServerFn({
  method: 'POST',
})
  .inputValidator((data: AddExpenseInput) => addExpenseSchema.parse(data))
  .handler(async ({ data }: { data: AddExpenseInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    const today = getToday()

    await db.insert(expenses).values({
      userId: session.id,
      amount: data.amount,
      description: data.description || null,
      category: data.category,
      date: today,
    })

    const todayLog = await db.query.dailyLogs.findFirst({
      where: and(eq(dailyLogs.userId, session.id), eq(dailyLogs.date, today)),
    })

    if (todayLog) {
      const newTotalSpent = todayLog.totalSpent + data.amount
      const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

      await db
        .update(dailyLogs)
        .set({
          totalSpent: newTotalSpent,
          remaining: newRemaining,
        })
        .where(eq(dailyLogs.id, todayLog.id))
    }

    return { success: true }
  })

/**
 * Delete an expense by ID
 */
export const deleteExpense = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    const today = getToday()

    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, data.id),
    })

    if (!expense) return { success: false }

    await db.delete(expenses).where(eq(expenses.id, data.id))

    const todayLog = await db.query.dailyLogs.findFirst({
      where: and(eq(dailyLogs.userId, session.id), eq(dailyLogs.date, today)),
    })

    if (todayLog) {
      const newTotalSpent = todayLog.totalSpent - expense.amount
      const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

      await db
        .update(dailyLogs)
        .set({
          totalSpent: newTotalSpent,
          remaining: newRemaining,
        })
        .where(eq(dailyLogs.id, todayLog.id))
    }

    return { success: true }
  })

/**
 * Update user's currency preference
 */
export const updateCurrency = createServerFn({
  method: 'POST',
})
  .inputValidator((data: UpdateCurrencyInput) => updateCurrencySchema.parse(data))
  .handler(async ({ data }: { data: UpdateCurrencyInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db.update(users).set({ currency: data.currency }).where(eq(users.id, session.id))

    return { success: true }
  })

/**
 * Update user's month start day preference
 */
export const updateMonthStartDay = createServerFn({
  method: 'POST',
})
  .inputValidator((data: UpdateMonthStartDayInput) => updateMonthStartDaySchema.parse(data))
  .handler(async ({ data }: { data: UpdateMonthStartDayInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db
      .update(users)
      .set({ monthStartDay: data.monthStartDay })
      .where(eq(users.id, session.id))

    return { success: true }
  })

/**
 * Add a fixed expense (recurring monthly)
 */
export const addFixedExpense = createServerFn({
  method: 'POST',
})
  .inputValidator((data: AddFixedExpenseInput) => addFixedExpenseSchema.parse(data))
  .handler(async ({ data }: { data: AddFixedExpenseInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db.insert(fixedExpenses).values({
      userId: session.id,
      name: data.name,
      amount: data.amount,
    })

    return { success: true }
  })

/**
 * Delete a fixed expense by ID
 */
export const deleteFixedExpense = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db
      .delete(fixedExpenses)
      .where(and(eq(fixedExpenses.id, data.id), eq(fixedExpenses.userId, session.id)))

    return { success: true }
  })

/**
 * Add income for the current month
 */
export const addIncome = createServerFn({
  method: 'POST',
})
  .inputValidator((data: AddIncomeInput) => addIncomeSchema.parse(data))
  .handler(async ({ data }: { data: AddIncomeInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    const month = getCurrentMonth()
    const year = getCurrentYear()

    await db.insert(incomes).values({
      userId: session.id,
      amount: data.amount,
      description: data.description || null,
      month,
      year,
    })

    return { success: true }
  })

/**
 * Delete income by ID
 */
export const deleteIncome = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db.delete(incomes).where(and(eq(incomes.id, data.id), eq(incomes.userId, session.id)))

    return { success: true }
  })
