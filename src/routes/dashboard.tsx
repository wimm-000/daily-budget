import { useState } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { 
  Plus, Minus, Calendar, TrendingUp, TrendingDown, Wallet, Settings, Banknote, 
  Copy, ChevronLeft, ChevronRight, Utensils, Car, Tv, ShoppingBag, Receipt, 
  Heart, HelpCircle 
} from 'lucide-react'

import { db } from '@/db'
import { budgets, expenses, dailyLogs, users, fixedExpenses, incomes, EXPENSE_CATEGORIES } from '@/db/schema'
import type { ExpenseCategory } from '@/db/schema'
import { getSession } from '@/lib/session'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppHeader } from '@/components/AppHeader'

// Category configuration
const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: typeof Utensils; color: string }> = {
  food: { label: 'Food & Drinks', icon: Utensils, color: 'text-orange-500' },
  transport: { label: 'Transport', icon: Car, color: 'text-blue-500' },
  entertainment: { label: 'Entertainment', icon: Tv, color: 'text-purple-500' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
  bills: { label: 'Bills', icon: Receipt, color: 'text-yellow-500' },
  health: { label: 'Health', icon: Heart, color: 'text-red-500' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-gray-500' },
}

// Helper functions
function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getCurrentMonth() {
  return new Date().getMonth() + 1
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

// Helper to get previous month/year
function getPreviousMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) {
    return { month: 12, year: year - 1 }
  }
  return { month: month - 1, year }
}

// Server Functions
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
  const currentMonth = getCurrentMonth()
  const currentYear = getCurrentYear()
  
  // Use provided month/year for viewing, default to current
  const viewMonth = data?.viewMonth || currentMonth
  const viewYear = data?.viewYear || currentYear
  const isCurrentMonth = viewMonth === currentMonth && viewYear === currentYear

  // Get user with currency preference
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
  })

  // Get viewed month's budget
  let budget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, session.id),
      eq(budgets.month, viewMonth),
      eq(budgets.year, viewYear)
    ),
  })

  // Track if budget was copied from previous month
  let budgetCopiedFromPreviousMonth = false

  // Only auto-copy budget when viewing current month
  if (!budget && isCurrentMonth) {
    const prev = getPreviousMonth(viewMonth, viewYear)
    const previousBudget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, session.id),
        eq(budgets.month, prev.month),
        eq(budgets.year, prev.year)
      ),
    })

    if (previousBudget) {
      // Copy previous month's budget to current month
      const [newBudget] = await db.insert(budgets).values({
        userId: session.id,
        monthlyAmount: previousBudget.monthlyAmount,
        month: viewMonth,
        year: viewYear,
      }).returning()
      
      budget = newBudget
      budgetCopiedFromPreviousMonth = true
    }
  }

  // Get fixed expenses (these persist across months)
  const userFixedExpenses = await db.query.fixedExpenses.findMany({
    where: eq(fixedExpenses.userId, session.id),
    orderBy: [desc(fixedExpenses.createdAt)],
  })

  // Get this month's incomes (NOT copied from previous month)
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

  // Initialize today's log if we have a budget but no log for today (only for current month)
  if (budget && isCurrentMonth) {
    const existingLog = await db.query.dailyLogs.findFirst({
      where: and(
        eq(dailyLogs.userId, session.id),
        eq(dailyLogs.date, today)
      ),
    })

    if (!existingLog) {
      await initializeDailyLog(
        session.id,
        budget.monthlyAmount,
        totalFixedExpenses,
        totalIncomes,
        viewMonth,
        viewYear
      )
    }
  }

  // Get today's log (may have just been created)
  const todayLog = isCurrentMonth ? await db.query.dailyLogs.findFirst({
    where: and(
      eq(dailyLogs.userId, session.id),
      eq(dailyLogs.date, today)
    ),
  }) : null

  // Get today's expenses (only for current month view)
  const todayExpenses = isCurrentMonth ? await db.query.expenses.findMany({
    where: and(
      eq(expenses.userId, session.id),
      eq(expenses.date, today)
    ),
    orderBy: [desc(expenses.createdAt)],
  }) : []

  // Get daily logs for the viewed month
  const startOfMonth = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`
  const endOfMonth = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${getDaysInMonth(viewMonth, viewYear)}`
  
  const recentLogs = await db.query.dailyLogs.findMany({
    where: and(
      eq(dailyLogs.userId, session.id),
      // Filter to viewed month
    ),
    orderBy: [desc(dailyLogs.date)],
    limit: 31, // Max days in a month
  })

  // Filter logs to viewed month (since SQLite date comparison is tricky)
  const filteredLogs = recentLogs.filter(log => {
    return log.date >= startOfMonth && log.date <= endOfMonth
  })

  // Get all expenses for the viewed month (for history view)
  const monthExpenses = await db.query.expenses.findMany({
    where: eq(expenses.userId, session.id),
    orderBy: [desc(expenses.date), desc(expenses.createdAt)],
  })

  const filteredMonthExpenses = monthExpenses.filter(exp => {
    return exp.date >= startOfMonth && exp.date <= endOfMonth
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
    isCurrentMonth,
  }
})

const setBudgetSchema = z.object({
  monthlyAmount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number(),
})

type SetBudgetInput = z.infer<typeof setBudgetSchema>

const setBudget = createServerFn({
  method: 'POST',
})
  .inputValidator((data: SetBudgetInput) => setBudgetSchema.parse(data))
  .handler(async ({ data }: { data: SetBudgetInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    // Check if budget already exists for this month
    const existing = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, session.id),
        eq(budgets.month, data.month),
        eq(budgets.year, data.year)
      ),
    })

    if (existing) {
      await db.update(budgets)
        .set({ monthlyAmount: data.monthlyAmount })
        .where(eq(budgets.id, existing.id))
    } else {
      await db.insert(budgets).values({
        userId: session.id,
        monthlyAmount: data.monthlyAmount,
        month: data.month,
        year: data.year,
      })
    }

    // Get fixed expenses to calculate available budget
    const userFixedExpenses = await db.query.fixedExpenses.findMany({
      where: eq(fixedExpenses.userId, session.id),
    })
    const totalFixed = userFixedExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Get this month's incomes
    const monthIncomes = await db.query.incomes.findMany({
      where: and(
        eq(incomes.userId, session.id),
        eq(incomes.month, data.month),
        eq(incomes.year, data.year)
      ),
    })
    const totalIncomes = monthIncomes.reduce((sum, i) => sum + i.amount, 0)

    // Initialize today's log if needed
    await initializeDailyLog(session.id, data.monthlyAmount, totalFixed, totalIncomes, data.month, data.year)

    return { success: true }
  })

async function initializeDailyLog(
  userId: number,
  monthlyAmount: number,
  totalFixedExpenses: number,
  totalIncomes: number,
  month: number,
  year: number
) {
  const today = getToday()
  const daysInMonth = getDaysInMonth(month, year)
  
  // Available = Monthly Budget + Incomes - Fixed Expenses
  const availableForDaily = monthlyAmount + totalIncomes - totalFixedExpenses
  const dailyBudget = Math.max(0, availableForDaily / daysInMonth)

  // Check if today's log exists
  const existing = await db.query.dailyLogs.findFirst({
    where: and(
      eq(dailyLogs.userId, userId),
      eq(dailyLogs.date, today)
    ),
  })

  if (!existing) {
    // Get yesterday's remaining to calculate carryover
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    // Check if yesterday was in a different month - if so, reset carryover
    const yesterdayMonth = yesterday.getMonth() + 1
    const yesterdayYear = yesterday.getFullYear()
    const isNewMonth = yesterdayMonth !== month || yesterdayYear !== year

    let carryover = 0
    
    // Only carry over if within the same month
    if (!isNewMonth) {
      const yesterdayLog = await db.query.dailyLogs.findFirst({
        where: and(
          eq(dailyLogs.userId, userId),
          eq(dailyLogs.date, yesterdayStr)
        ),
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
    // Update existing log with new daily budget (in case fixed expenses changed)
    const newRemaining = dailyBudget + existing.carryover - existing.totalSpent
    await db.update(dailyLogs)
      .set({ dailyBudget, remaining: newRemaining })
      .where(eq(dailyLogs.id, existing.id))
  }
}

const addExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional().default('other'),
})

type AddExpenseInput = z.infer<typeof addExpenseSchema>

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

    // Add expense
    await db.insert(expenses).values({
      userId: session.id,
      amount: data.amount,
      description: data.description || null,
      category: data.category,
      date: today,
    })

    // Update daily log
    const todayLog = await db.query.dailyLogs.findFirst({
      where: and(
        eq(dailyLogs.userId, session.id),
        eq(dailyLogs.date, today)
      ),
    })

    if (todayLog) {
      const newTotalSpent = todayLog.totalSpent + data.amount
      const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

      await db.update(dailyLogs)
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

    // Get the expense to know the amount
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, data.id),
    })

    if (!expense) return { success: false }

    // Delete expense
    await db.delete(expenses).where(eq(expenses.id, data.id))

    // Update daily log
    const todayLog = await db.query.dailyLogs.findFirst({
      where: and(
        eq(dailyLogs.userId, session.id),
        eq(dailyLogs.date, today)
      ),
    })

    if (todayLog) {
      const newTotalSpent = todayLog.totalSpent - expense.amount
      const newRemaining = todayLog.dailyBudget + todayLog.carryover - newTotalSpent

      await db.update(dailyLogs)
        .set({
          totalSpent: newTotalSpent,
          remaining: newRemaining,
        })
        .where(eq(dailyLogs.id, todayLog.id))
    }

    return { success: true }
  })

const updateCurrencySchema = z.object({
  currency: z.enum(['USD', 'EUR']),
})

type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>

const updateCurrency = createServerFn({
  method: 'POST',
})
  .inputValidator((data: UpdateCurrencyInput) => updateCurrencySchema.parse(data))
  .handler(async ({ data }: { data: UpdateCurrencyInput }) => {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }

    await db.update(users)
      .set({ currency: data.currency })
      .where(eq(users.id, session.id))
    
    return { success: true }
  })

// Fixed Expenses Server Functions
const addFixedExpenseSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
})

type AddFixedExpenseInput = z.infer<typeof addFixedExpenseSchema>

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

    await db.delete(fixedExpenses).where(
      and(
        eq(fixedExpenses.id, data.id),
        eq(fixedExpenses.userId, session.id)
      )
    )

    return { success: true }
  })

// Income Server Functions
const addIncomeSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
})

type AddIncomeInput = z.infer<typeof addIncomeSchema>

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

    await db.delete(incomes).where(
      and(
        eq(incomes.id, data.id),
        eq(incomes.userId, session.id)
      )
    )

    return { success: true }
  })

// Route
const searchParamsSchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().optional(),
})

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  validateSearch: (search) => searchParamsSchema.parse(search),
  loaderDeps: ({ search }) => ({ viewMonth: search.month, viewYear: search.year }),
  loader: async ({ deps }) => await getDashboardData({ data: { viewMonth: deps.viewMonth, viewYear: deps.viewYear } }),
})

function DashboardPage() {
  const router = useRouter()
  const data = Route.useLoaderData()

  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [isFixedExpenseOpen, setIsFixedExpenseOpen] = useState(false)
  const [isIncomeOpen, setIsIncomeOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const [monthlyAmount, setMonthlyAmount] = useState(
    data?.budget?.monthlyAmount?.toString() || ''
  )
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

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Update currency if changed
      if (selectedCurrency !== data?.user?.currency) {
        await updateCurrency({ data: { currency: selectedCurrency } })
      }
      
      await setBudget({
        data: {
          monthlyAmount: parseFloat(monthlyAmount),
          month: data?.month || getCurrentMonth(),
          year: data?.year || getCurrentYear(),
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

  const todayLog = data?.todayLog
  const budget = data?.budget
  const currency = data?.user?.currency || 'EUR'
  const daysInMonth = getDaysInMonth(data?.month || getCurrentMonth(), data?.year || getCurrentYear())
  
  // Calculate daily budget: (Monthly + Incomes - Fixed Expenses) / Days
  const totalFixedExpenses = data?.totalFixedExpenses || 0
  const totalIncomes = data?.totalIncomes || 0
  const availableForDaily = (budget?.monthlyAmount || 0) + totalIncomes - totalFixedExpenses
  const dailyBudget = budget ? Math.max(0, availableForDaily / daysInMonth) : 0

  const formatCurrency = (amount: number) => {
    const locale = currency === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatMonthYear = (month: number, year: number) => {
    const date = new Date(year, month - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const isCurrentMonth = data?.isCurrentMonth ?? true
  const viewMonth = data?.month || getCurrentMonth()
  const viewYear = data?.year || getCurrentYear()

  const goToPreviousMonth = () => {
    const prev = getPreviousMonth(viewMonth, viewYear)
    router.navigate({ 
      to: '/dashboard', 
      search: { month: prev.month, year: prev.year } 
    })
  }

  const goToNextMonth = () => {
    const next = viewMonth === 12 ? { month: 1, year: viewYear + 1 } : { month: viewMonth + 1, year: viewYear }
    router.navigate({ 
      to: '/dashboard', 
      search: { month: next.month, year: next.year } 
    })
  }

  const goToCurrentMonth = () => {
    router.navigate({ to: '/dashboard', search: {} })
  }

  // Check if next month is in the future
  const currentMonth = getCurrentMonth()
  const currentYear = getCurrentYear()
  const canGoNext = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showAdminLink={data?.user?.role === 'admin'} />

      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold">{formatMonthYear(viewMonth, viewYear)}</h2>
              {!isCurrentMonth && (
                <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                  Today
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              disabled={!canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Past Month Notice */}
          {!isCurrentMonth && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-700 dark:text-yellow-300">
              Viewing historical data for {formatMonthYear(viewMonth, viewYear)}. 
              <Button 
                variant="link" 
                className="h-auto p-0 ml-1 text-yellow-700 dark:text-yellow-300 underline"
                onClick={goToCurrentMonth}
              >
                Go to current month
              </Button>
            </div>
          )}

          {/* Budget Overview */}
          {!budget ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>{isCurrentMonth ? 'Welcome to Daily Budget' : 'No Budget Data'}</CardTitle>
                <CardDescription>
                  {isCurrentMonth 
                    ? 'Set your monthly budget to get started'
                    : `No budget was set for ${formatMonthYear(viewMonth, viewYear)}`
                  }
                </CardDescription>
              </CardHeader>
              {isCurrentMonth && (
                <CardContent className="flex justify-center">
                  <Button onClick={() => setIsBudgetOpen(true)}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Set Monthly Budget
                  </Button>
                </CardContent>
              )}
            </Card>
          ) : (
            <>
              {/* Summary Card - Different for current vs past months */}
              {isCurrentMonth ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                      {/* Circle Progress */}
                      {(() => {
                        const totalBudget = dailyBudget + (todayLog?.carryover ?? 0)
                        const spent = todayLog?.totalSpent ?? 0
                        const remaining = todayLog?.remaining ?? dailyBudget
                        const isOverspent = remaining < 0
                        
                        // Calculate percentage (0-100), capped for display
                        let spentPercent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0
                        if (isOverspent) spentPercent = 100 + Math.min(50, (Math.abs(remaining) / totalBudget) * 50)
                        spentPercent = Math.min(spentPercent, 150) // Cap at 150% for visual
                        
                        const radius = 40
                        const strokeWidth = 8
                        const circumference = 2 * Math.PI * radius
                        const spentOffset = circumference - (Math.min(spentPercent, 100) / 100) * circumference
                        const overspentOffset = isOverspent 
                          ? circumference - ((spentPercent - 100) / 50) * circumference 
                          : circumference
                        
                        return (
                          <div className="relative flex-shrink-0">
                            <svg width="100" height="100" className="transform -rotate-90">
                              {/* Background circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                className="text-muted-foreground/30"
                              />
                              {/* Spent portion (green when under budget) */}
                              <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={spentOffset}
                                strokeLinecap="round"
                                className={isOverspent ? 'text-yellow-500' : 'text-green-500'}
                              />
                              {/* Overspent portion (red) */}
                              {isOverspent && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={circumference}
                                  strokeDashoffset={overspentOffset}
                                  strokeLinecap="round"
                                  className="text-destructive"
                                />
                              )}
                            </svg>
                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-lg font-bold ${isOverspent ? 'text-destructive' : 'text-green-600'}`}>
                                {isOverspent ? '-' : ''}{Math.round(isOverspent ? spentPercent - 100 : 100 - spentPercent)}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {isOverspent ? 'over' : 'left'}
                              </span>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Available Today</p>
                            <div className={`text-2xl sm:text-3xl font-bold ${
                              (todayLog?.remaining ?? 0) < 0 ? 'text-destructive' : 'text-green-600'
                            }`}>
                              {formatCurrency(todayLog?.remaining ?? dailyBudget)}
                            </div>
                            {todayLog && todayLog.carryover !== 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                {todayLog.carryover > 0 ? (
                                  <><TrendingUp className="h-3 w-3 text-green-600" /> +{formatCurrency(todayLog.carryover)} carried</>
                                ) : (
                                  <><TrendingDown className="h-3 w-3 text-destructive" /> {formatCurrency(todayLog.carryover)} debt</>
                                )}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-4 sm:gap-6 text-sm">
                            <div>
                              <p className="text-muted-foreground">Budget</p>
                              <p className="font-semibold">{formatCurrency(dailyBudget)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Spent</p>
                              <p className="font-semibold">{formatCurrency(todayLog?.totalSpent ?? 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Past month summary */
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                      {/* Circle Progress for month */}
                      {(() => {
                        const monthlyBudget = availableForDaily
                        const spent = data?.monthExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0
                        const isOverspent = spent > monthlyBudget
                        
                        let spentPercent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0
                        if (isOverspent) spentPercent = 100 + Math.min(50, ((spent - monthlyBudget) / monthlyBudget) * 50)
                        spentPercent = Math.min(spentPercent, 150)
                        
                        const radius = 40
                        const strokeWidth = 8
                        const circumference = 2 * Math.PI * radius
                        const spentOffset = circumference - (Math.min(spentPercent, 100) / 100) * circumference
                        const overspentOffset = isOverspent 
                          ? circumference - ((spentPercent - 100) / 50) * circumference 
                          : circumference
                        
                        return (
                          <div className="relative flex-shrink-0">
                            <svg width="100" height="100" className="transform -rotate-90">
                              <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                className="text-muted-foreground/30"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={spentOffset}
                                strokeLinecap="round"
                                className={isOverspent ? 'text-yellow-500' : 'text-green-500'}
                              />
                              {isOverspent && (
                                <circle
                                  cx="50"
                                  cy="50"
                                  r={radius}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={strokeWidth}
                                  strokeDasharray={circumference}
                                  strokeDashoffset={overspentOffset}
                                  strokeLinecap="round"
                                  className="text-destructive"
                                />
                              )}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={`text-lg font-bold ${isOverspent ? 'text-destructive' : 'text-green-600'}`}>
                                {Math.round(Math.min(spentPercent, 100))}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">used</span>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Spent</p>
                            <div className="text-2xl sm:text-3xl font-bold">
                              {formatCurrency(data?.monthExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {data?.monthExpenses?.length ?? 0} expense(s)
                            </p>
                          </div>
                          
                          <div className="flex gap-4 sm:gap-6 text-sm">
                            <div>
                              <p className="text-muted-foreground">Budget</p>
                              <p className="font-semibold">{formatCurrency(availableForDaily)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Days</p>
                              <p className="font-semibold">{data?.recentLogs?.length ?? 0}/{daysInMonth}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions - Only show for current month */}
              {isCurrentMonth && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setIsExpenseOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button variant="outline" onClick={() => setIsIncomeOpen(true)}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                  <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              )}

              {/* Budget Copied Indicator */}
              {data?.budgetCopiedFromPreviousMonth && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
                  <Copy className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Your monthly budget was automatically copied from last month. 
                    <Button 
                      variant="link" 
                      className="h-auto p-0 ml-1 text-blue-700 dark:text-blue-300 underline"
                      onClick={() => setIsBudgetOpen(true)}
                    >
                      Edit budget
                    </Button>
                  </span>
                </div>
              )}

              {/* Monthly Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Monthly Overview
                  </CardTitle>
                  <CardDescription>
                    Budget breakdown for this month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Budget</span>
                      <span>{formatCurrency(budget.monthlyAmount)}</span>
                    </div>
                    {totalIncomes > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>+ Added Money</span>
                        <span>+{formatCurrency(totalIncomes)}</span>
                      </div>
                    )}
                    {totalFixedExpenses > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>- Fixed Expenses</span>
                        <span>-{formatCurrency(totalFixedExpenses)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Available for Daily</span>
                      <span className={availableForDaily < 0 ? 'text-destructive' : ''}>
                        {formatCurrency(availableForDaily)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Daily Budget ({daysInMonth} days)</span>
                      <span>{formatCurrency(dailyBudget)}/day</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Expenses / Month Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {isCurrentMonth ? "Today's Expenses" : "Month Expenses"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isCurrentMonth ? (
                    /* Current month - show today's expenses */
                    data?.todayExpenses && data.todayExpenses.length > 0 ? (
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.todayExpenses.map((expense) => {
                              const cat = (expense.category || 'other') as ExpenseCategory
                              const config = CATEGORY_CONFIG[cat]
                              const Icon = config.icon
                              return (
                                <TableRow key={expense.id}>
                                  <TableCell>
                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                  </TableCell>
                                  <TableCell>{expense.description || config.label}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(expense.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteExpense(expense.id)}
                                    >
                                      <Minus className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No expenses recorded today
                      </p>
                    )
                  ) : (
                    /* Past month - show all month expenses */
                    data?.monthExpenses && data.monthExpenses.length > 0 ? (
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.monthExpenses.map((expense) => {
                              const cat = (expense.category || 'other') as ExpenseCategory
                              const config = CATEGORY_CONFIG[cat]
                              const Icon = config.icon
                              return (
                                <TableRow key={expense.id}>
                                  <TableCell>
                                    <Icon className={`h-4 w-4 ${config.color}`} />
                                  </TableCell>
                                  <TableCell className="text-muted-foreground whitespace-nowrap">
                                    {formatDate(expense.date)}
                                  </TableCell>
                                  <TableCell>{expense.description || config.label}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(expense.amount)}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No expenses recorded this month
                      </p>
                    )
                  )}
                </CardContent>
              </Card>

              {/* Daily Log History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{isCurrentMonth ? 'Recent Days' : 'Daily History'}</CardTitle>
                  <CardDescription>Your spending history and carryover</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.recentLogs && data.recentLogs.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Date</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Budget</TableHead>
                            <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">Carryover</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Spent</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Remaining</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.recentLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {formatDate(log.date)}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {formatCurrency(log.dailyBudget)}
                              </TableCell>
                              <TableCell className={`text-right whitespace-nowrap hidden sm:table-cell ${
                                log.carryover > 0 ? 'text-green-600' : log.carryover < 0 ? 'text-destructive' : ''
                              }`}>
                                {log.carryover > 0 ? '+' : ''}{formatCurrency(log.carryover)}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {formatCurrency(log.totalSpent)}
                              </TableCell>
                              <TableCell className={`text-right whitespace-nowrap font-medium ${
                                log.remaining < 0 ? 'text-destructive' : 'text-green-600'
                              }`}>
                                {formatCurrency(log.remaining)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No history yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* Set Budget Dialog */}
      <Dialog open={isBudgetOpen} onOpenChange={setIsBudgetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly Budget</DialogTitle>
            <DialogDescription>
              Enter your total budget for this month. We'll calculate your daily allowance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetBudget}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as 'USD' | 'EUR')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">&#8364; EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-amount">Monthly Budget</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {selectedCurrency === 'EUR' ? '\u20AC' : '$'}
                  </span>
                  <Input
                    id="monthly-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              {monthlyAmount && parseFloat(monthlyAmount) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Daily budget: {formatCurrency(parseFloat(monthlyAmount) / daysInMonth)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBudgetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense for today.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExpense}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency === 'EUR' ? '\u20AC' : '$'}
                  </span>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <Select value={expenseCategory} onValueChange={(v) => setExpenseCategory(v as ExpenseCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const config = CATEGORY_CONFIG[cat]
                      const Icon = config.icon
                      return (
                        <SelectItem key={cat} value={cat}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-description">Description (optional)</Label>
                <Input
                  id="expense-description"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Coffee, lunch, groceries..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Income Dialog */}
      <Dialog open={isIncomeOpen} onOpenChange={setIsIncomeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Money</DialogTitle>
            <DialogDescription>
              Add extra income or money to this month's budget.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIncome}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="income-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency === 'EUR' ? '\u20AC' : '$'}
                  </span>
                  <Input
                    id="income-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-description">Description (optional)</Label>
                <Input
                  id="income-description"
                  value={incomeDescription}
                  onChange={(e) => setIncomeDescription(e.target.value)}
                  placeholder="Bonus, gift, refund..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsIncomeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Money'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog (Fixed Expenses & Budget) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Budget Settings</DialogTitle>
            <DialogDescription>
              Manage your monthly budget and fixed expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Monthly Budget Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-base font-medium">Monthly Budget</Label>
                <Button variant="outline" size="sm" onClick={() => { setIsSettingsOpen(false); setIsBudgetOpen(true); }}>
                  Edit Budget
                </Button>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(budget?.monthlyAmount || 0)}
              </div>
            </div>

            {/* Fixed Expenses Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <Label className="text-base font-medium">Fixed Monthly Expenses</Label>
                  <p className="text-sm text-muted-foreground">
                    Rent, subscriptions, bills - deducted before calculating daily budget
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start" onClick={() => setIsFixedExpenseOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {data?.fixedExpenses && data.fixedExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.fixedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFixedExpense(expense.id)}
                            >
                              <Minus className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(totalFixedExpenses)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4 border rounded-md">
                  No fixed expenses added
                </p>
              )}
            </div>

            {/* This Month's Income Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <Label className="text-base font-medium">Added Money This Month</Label>
                  <p className="text-sm text-muted-foreground">
                    Extra income added to this month's budget
                  </p>
                </div>
              </div>
              
              {data?.incomes && data.incomes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.incomes.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell>{income.description || 'No description'}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            +{formatCurrency(income.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIncome(income.id)}
                            >
                              <Minus className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          +{formatCurrency(totalIncomes)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4 border rounded-md">
                  No extra money added this month
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fixed Expense Dialog */}
      <Dialog open={isFixedExpenseOpen} onOpenChange={setIsFixedExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fixed Expense</DialogTitle>
            <DialogDescription>
              Add a recurring monthly expense like rent, subscriptions, or bills.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFixedExpense}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fixed-expense-name">Name</Label>
                <Input
                  id="fixed-expense-name"
                  value={fixedExpenseName}
                  onChange={(e) => setFixedExpenseName(e.target.value)}
                  placeholder="Rent, Netflix, Gym..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed-expense-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency === 'EUR' ? '\u20AC' : '$'}
                  </span>
                  <Input
                    id="fixed-expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fixedExpenseAmount}
                    onChange={(e) => setFixedExpenseAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFixedExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Fixed Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
