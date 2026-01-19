import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { ExpenseCategory } from '@/db/schema'
import {
  formatPeriodDisplay,
  isFuturePeriod,
} from '@/lib/budget-period'
import {
  getCurrentMonth,
  getCurrentYear,
  getDaysInMonth,
  getPreviousMonth,
  formatCurrency as formatCurrencyHelper,
  formatDate as formatDateHelper,
} from '@/lib/dashboard-helpers'
import { dashboardSearchParamsCoercedSchema } from '@/lib/validations'

import {
  getDashboardData,
  setBudget,
  addExpense,
  deleteExpense,
  updateCurrency,
  updateMonthStartDay,
  addFixedExpense,
  deleteFixedExpense,
  addIncome,
  deleteIncome,
} from '@/server/dashboard'

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
