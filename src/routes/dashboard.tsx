import { useState } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq, and, desc } from 'drizzle-orm'

import { db } from '@/db'
import { budgets, expenses, dailyLogs, users, fixedExpenses, incomes } from '@/db/schema'
import type { ExpenseCategory } from '@/db/schema'
import { getSession } from '@/lib/session'
import {
  getBudgetPeriod,
  getBudgetPeriodForDate,
  getToday as getTodayFromLib,
  formatPeriodDisplay,
  areDatesInSamePeriod,
  isCurrentPeriod,
  isFuturePeriod,
  getYesterday,
} from '@/lib/budget-period'
import {
  getCurrentMonth,
  getCurrentYear,
  getDaysInMonth,
  getPreviousMonth,
  getEffectiveStartDay,
  formatCurrency as formatCurrencyHelper,
  formatDate as formatDateHelper,
} from '@/lib/dashboard-helpers'
import {
  setBudgetSchema,
  addExpenseSchema,
  addFixedExpenseSchema,
  addIncomeSchema,
  updateMonthStartDaySchema,
  updateCurrencySchema,
  dashboardSearchParamsCoercedSchema,
  type SetBudgetInput,
  type AddExpenseInput,
  type AddFixedExpenseInput,
  type AddIncomeInput,
  type UpdateMonthStartDayInput,
  type UpdateCurrencyInput,
} from '@/lib/validations'

import { AppHeader } from '@/components/AppHeader'
import {
  MonthNavigation,
  PastMonthNotice,
  TodaySummaryCard,
  PastMonthSummaryCard,
  MonthlyOverviewCard,
  ExpensesCard,
  DailyLogHistoryCard,
  QuickActions,
  BudgetCopiedNotice,
  NoBudgetCard,
  SetBudgetDialog,
  AddExpenseDialog,
  AddIncomeDialog,
  AddFixedExpenseDialog,
  SettingsDialog,
} from '@/components/dashboard'

// Helper wrapper for getToday (used throughout this file)
function getToday() {
  return getTodayFromLib()
}

// =============================================================================
// Server Functions
// =============================================================================

const getDashboardData = createServerFn({
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

const setBudget = createServerFn({
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

const addExpense = createServerFn({
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

const deleteExpense = createServerFn({
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

const updateCurrency = createServerFn({
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

const updateMonthStartDay = createServerFn({
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

const addFixedExpense = createServerFn({
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

const deleteFixedExpense = createServerFn({
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

const addIncome = createServerFn({
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

const deleteIncome = createServerFn({
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

// =============================================================================
// Route
// =============================================================================

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  validateSearch: (search) => dashboardSearchParamsCoercedSchema.parse(search),
  loaderDeps: ({ search }) => ({ viewMonth: search.month, viewYear: search.year }),
  loader: async ({ deps }) =>
    await getDashboardData({ data: { viewMonth: deps.viewMonth, viewYear: deps.viewYear } }),
})

// =============================================================================
// Dashboard Page Component
// =============================================================================

function DashboardPage() {
  const router = useRouter()
  const data = Route.useLoaderData()

  // Dialog states
  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isFixedExpenseOpen, setIsFixedExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Form states
  const [monthlyAmount, setMonthlyAmount] = useState(data?.budget?.monthlyAmount?.toString() || '')
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR'>(
    data?.user?.currency || 'EUR'
  )
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('other')
  const [fixedExpenseName, setFixedExpenseName] = useState('')
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDescription, setIncomeDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMonthStartDay, setSelectedMonthStartDay] = useState<number>(
    data?.userStartDay ?? 1
  )
  const [budgetStartDayOverride, setBudgetStartDayOverride] = useState<number | null>(
    data?.budget?.startDay ?? null
  )

  // Derived values
  const todayLog = data?.todayLog
  const budget = data?.budget
  const currency = data?.user?.currency || 'EUR'
  const daysInPeriod =
    data?.period?.daysInPeriod ||
    getDaysInMonth(data?.month || getCurrentMonth(), data?.year || getCurrentYear())
  const effectiveStartDay = data?.effectiveStartDay ?? 1
  const totalFixedExpenses = data?.totalFixedExpenses || 0
  const totalIncomes = data?.totalIncomes || 0
  const availableForDaily = (budget?.monthlyAmount || 0) + totalIncomes - totalFixedExpenses
  const dailyBudget = budget ? Math.max(0, availableForDaily / daysInPeriod) : 0
  const isCurrentMonth = data?.isCurrentMonth ?? true
  const viewMonth = data?.month || getCurrentMonth()
  const viewYear = data?.year || getCurrentYear()

  // Formatting helpers
  const formatCurrency = (amount: number) => formatCurrencyHelper(amount, currency)
  const formatDate = (dateStr: string) => formatDateHelper(dateStr)

  const formatMonthYear = (month: number, year: number) => {
    if (data?.period && effectiveStartDay !== 1) {
      return formatPeriodDisplay(data.period, effectiveStartDay)
    }
    const date = new Date(year, month - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Navigation helpers
  const goToPreviousMonth = () => {
    const prev = getPreviousMonth(viewMonth, viewYear)
    router.navigate({
      to: '/dashboard',
      search: { month: prev.month, year: prev.year },
    })
  }

  const goToNextMonth = () => {
    const next =
      viewMonth === 12 ? { month: 1, year: viewYear + 1 } : { month: viewMonth + 1, year: viewYear }
    router.navigate({
      to: '/dashboard',
      search: { month: next.month, year: next.year },
    })
  }

  const goToCurrentMonth = () => {
    router.navigate({ to: '/dashboard', search: {} })
  }

  const canGoNext = !isFuturePeriod(
    viewMonth === 12 ? 1 : viewMonth + 1,
    viewMonth === 12 ? viewYear + 1 : viewYear,
    effectiveStartDay
  )

  // Event handlers
  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (selectedCurrency !== data?.user?.currency) {
        await updateCurrency({ data: { currency: selectedCurrency } })
      }

      if (selectedMonthStartDay !== (data?.userStartDay ?? 1)) {
        await updateMonthStartDay({ data: { monthStartDay: selectedMonthStartDay } })
      }

      await setBudget({
        data: {
          monthlyAmount: parseFloat(monthlyAmount),
          month: data?.month || getCurrentMonth(),
          year: data?.year || getCurrentYear(),
          startDay: budgetStartDayOverride,
        },
      })
      setIsBudgetOpen(false)
      router.invalidate()
    } catch (err) {
      console.error('Failed to set budget:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await addExpense({
        data: {
          amount: parseFloat(expenseAmount),
          description: expenseDescription || undefined,
          category: expenseCategory,
        },
      })
      setIsExpenseOpen(false)
      setExpenseAmount('')
      setExpenseDescription('')
      setExpenseCategory('other')
      router.invalidate()
    } catch (err) {
      console.error('Failed to add expense:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (id: number) => {
    try {
      await deleteExpense({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await addFixedExpense({
        data: {
          name: fixedExpenseName,
          amount: parseFloat(fixedExpenseAmount),
        },
      })
      setIsFixedExpenseOpen(false)
      setFixedExpenseName('')
      setFixedExpenseAmount('')
      router.invalidate()
    } catch (err) {
      console.error('Failed to add fixed expense:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteFixedExpense = async (id: number) => {
    try {
      await deleteFixedExpense({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('Failed to delete fixed expense:', err)
    }
  }

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await addIncome({
        data: {
          amount: parseFloat(incomeAmount),
          description: incomeDescription || undefined,
        },
      })
      setIsIncomeOpen(false)
      setIncomeAmount('')
      setIncomeDescription('')
      router.invalidate()
    } catch (err) {
      console.error('Failed to add income:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteIncome = async (id: number) => {
    try {
      await deleteIncome({ data: { id } })
      router.invalidate()
    } catch (err) {
      console.error('Failed to delete income:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showAdminLink={data?.user?.role === 'admin'} />

      <main className="p-4 sm:p-6 md:p-8" style={{ viewTransitionName: 'page-content' }}>
        <div
          className="max-w-4xl mx-auto space-y-4 sm:space-y-6"
          style={{ viewTransitionName: 'month-content' }}
        >
          {/* Month Navigation */}
          <MonthNavigation
            formattedMonthYear={formatMonthYear(viewMonth, viewYear)}
            isCurrentMonth={isCurrentMonth}
            canGoNext={canGoNext}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            onGoToCurrent={goToCurrentMonth}
          />

          {/* Past Month Notice */}
          {!isCurrentMonth && (
            <PastMonthNotice
              formattedMonthYear={formatMonthYear(viewMonth, viewYear)}
              onGoToCurrent={goToCurrentMonth}
            />
          )}

          {/* Budget Overview */}
          {!budget ? (
            <NoBudgetCard
              isCurrentMonth={isCurrentMonth}
              formattedMonthYear={formatMonthYear(viewMonth, viewYear)}
              onSetBudget={() => setIsBudgetOpen(true)}
            />
          ) : (
            <>
              {/* Summary Card - Different for current vs past months */}
              {isCurrentMonth ? (
                <TodaySummaryCard
                  todayLog={todayLog}
                  dailyBudget={dailyBudget}
                  formatCurrency={formatCurrency}
                  onSettingsClick={() => setIsSettingsOpen(true)}
                />
              ) : (
                <PastMonthSummaryCard
                  availableForDaily={availableForDaily}
                  monthExpenses={data?.monthExpenses}
                  recentLogs={data?.recentLogs}
                  daysInPeriod={daysInPeriod}
                  formatCurrency={formatCurrency}
                />
              )}

              {/* Quick Actions - Only show for current month */}
              {isCurrentMonth && (
                <QuickActions
                  onAddExpense={() => setIsExpenseOpen(true)}
                  onAddIncome={() => setIsIncomeOpen(true)}
                />
              )}

              {/* Budget Copied Indicator */}
              {data?.budgetCopiedFromPreviousMonth && (
                <BudgetCopiedNotice onEditBudget={() => setIsBudgetOpen(true)} />
              )}

              {/* Monthly Overview */}
              <MonthlyOverviewCard
                budget={budget}
                totalFixedExpenses={totalFixedExpenses}
                totalIncomes={totalIncomes}
                availableForDaily={availableForDaily}
                daysInPeriod={daysInPeriod}
                dailyBudget={dailyBudget}
                formatCurrency={formatCurrency}
              />

              {/* Today's Expenses / Month Expenses */}
              <ExpensesCard
                isCurrentMonth={isCurrentMonth}
                todayExpenses={data?.todayExpenses}
                monthExpenses={data?.monthExpenses}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onDeleteExpense={handleDeleteExpense}
              />

              {/* Daily Log History */}
              <DailyLogHistoryCard
                isCurrentMonth={isCurrentMonth}
                recentLogs={data?.recentLogs}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <SetBudgetDialog
        open={isBudgetOpen}
        onOpenChange={setIsBudgetOpen}
        monthlyAmount={monthlyAmount}
        onMonthlyAmountChange={setMonthlyAmount}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        selectedMonthStartDay={selectedMonthStartDay}
        onMonthStartDayChange={setSelectedMonthStartDay}
        budgetStartDayOverride={budgetStartDayOverride}
        onBudgetStartDayOverrideChange={setBudgetStartDayOverride}
        daysInPeriod={daysInPeriod}
        formatCurrency={formatCurrency}
        isLoading={isLoading}
        onSubmit={handleSetBudget}
      />

      <AddExpenseDialog
        open={isExpenseOpen}
        onOpenChange={setIsExpenseOpen}
        currency={currency}
        expenseAmount={expenseAmount}
        onExpenseAmountChange={setExpenseAmount}
        expenseDescription={expenseDescription}
        onExpenseDescriptionChange={setExpenseDescription}
        expenseCategory={expenseCategory}
        onExpenseCategoryChange={setExpenseCategory}
        isLoading={isLoading}
        onSubmit={handleAddExpense}
      />

      <AddIncomeDialog
        open={isIncomeOpen}
        onOpenChange={setIsIncomeOpen}
        currency={currency}
        incomeAmount={incomeAmount}
        onIncomeAmountChange={setIncomeAmount}
        incomeDescription={incomeDescription}
        onIncomeDescriptionChange={setIncomeDescription}
        isLoading={isLoading}
        onSubmit={handleAddIncome}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        budget={budget}
        fixedExpenses={data?.fixedExpenses}
        incomes={data?.incomes}
        totalFixedExpenses={totalFixedExpenses}
        totalIncomes={totalIncomes}
        formatCurrency={formatCurrency}
        onEditBudget={() => {
          setIsSettingsOpen(false)
          setIsBudgetOpen(true)
        }}
        onAddFixedExpense={() => setIsFixedExpenseOpen(true)}
        onDeleteFixedExpense={handleDeleteFixedExpense}
        onDeleteIncome={handleDeleteIncome}
      />

      <AddFixedExpenseDialog
        open={isFixedExpenseOpen}
        onOpenChange={setIsFixedExpenseOpen}
        currency={currency}
        fixedExpenseName={fixedExpenseName}
        onFixedExpenseNameChange={setFixedExpenseName}
        fixedExpenseAmount={fixedExpenseAmount}
        onFixedExpenseAmountChange={setFixedExpenseAmount}
        isLoading={isLoading}
        onSubmit={handleAddFixedExpense}
      />
    </div>
  )
}
