import { useState } from 'react'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { Plus, Minus, Calendar, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

import { db } from '@/db'
import { budgets, expenses, dailyLogs, users } from '@/db/schema'
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

// Server Functions
const getDashboardData = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await getSession()
  if (!session) {
    throw redirect({ to: '/' })
  }

  const today = getToday()
  const month = getCurrentMonth()
  const year = getCurrentYear()

  // Get user with currency preference
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
  })

  // Get current month's budget
  const budget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, session.id),
      eq(budgets.month, month),
      eq(budgets.year, year)
    ),
  })

  // Get today's log
  const todayLog = await db.query.dailyLogs.findFirst({
    where: and(
      eq(dailyLogs.userId, session.id),
      eq(dailyLogs.date, today)
    ),
  })

  // Get today's expenses
  const todayExpenses = await db.query.expenses.findMany({
    where: and(
      eq(expenses.userId, session.id),
      eq(expenses.date, today)
    ),
    orderBy: [desc(expenses.createdAt)],
  })

  // Get recent daily logs for history
  const recentLogs = await db.query.dailyLogs.findMany({
    where: eq(dailyLogs.userId, session.id),
    orderBy: [desc(dailyLogs.date)],
    limit: 7,
  })

  return {
    user,
    budget,
    todayLog,
    todayExpenses,
    recentLogs,
    today,
    month,
    year,
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

    // Initialize today's log if needed
    await initializeDailyLog(session.id, data.monthlyAmount, data.month, data.year)

    return { success: true }
  })

async function initializeDailyLog(userId: number, monthlyAmount: number, month: number, year: number) {
  const today = getToday()
  const daysInMonth = getDaysInMonth(month, year)
  const dailyBudget = monthlyAmount / daysInMonth

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

    const yesterdayLog = await db.query.dailyLogs.findFirst({
      where: and(
        eq(dailyLogs.userId, userId),
        eq(dailyLogs.date, yesterdayStr)
      ),
    })

    const carryover = yesterdayLog?.remaining ?? 0

    await db.insert(dailyLogs).values({
      userId,
      date: today,
      dailyBudget,
      carryover,
      totalSpent: 0,
      remaining: dailyBudget + carryover,
    })
  }
}

const addExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
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

// Route
export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  loader: async () => await getDashboardData(),
})

function DashboardPage() {
  const router = useRouter()
  const data = Route.useLoaderData()

  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [monthlyAmount, setMonthlyAmount] = useState(
    data?.budget?.monthlyAmount?.toString() || ''
  )
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'EUR'>(
    data?.user?.currency || 'USD'
  )
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
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
        },
      })
      setIsExpenseOpen(false)
      setExpenseAmount('')
      setExpenseDescription('')
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

  const todayLog = data?.todayLog
  const budget = data?.budget
  const currency = data?.user?.currency || 'USD'
  const daysInMonth = getDaysInMonth(data?.month || getCurrentMonth(), data?.year || getCurrentYear())
  const dailyBudget = budget ? budget.monthlyAmount / daysInMonth : 0

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showAdminLink={data?.user?.role === 'admin'} />

      <main className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Budget Overview */}
          {!budget ? (
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Welcome to Daily Budget</CardTitle>
                <CardDescription>
                  Set your monthly budget to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button onClick={() => setIsBudgetOpen(true)}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Set Monthly Budget
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Today's Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Today's Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dailyBudget)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(budget.monthlyAmount)} / {daysInMonth} days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Available Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      (todayLog?.remaining ?? 0) < 0 ? 'text-destructive' : 'text-green-600'
                    }`}>
                      {formatCurrency(todayLog?.remaining ?? dailyBudget)}
                    </div>
                    {todayLog && todayLog.carryover !== 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {todayLog.carryover > 0 ? (
                          <><TrendingUp className="h-3 w-3 text-green-600" /> +{formatCurrency(todayLog.carryover)} carried over</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 text-destructive" /> {formatCurrency(todayLog.carryover)} from yesterday</>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Spent Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(todayLog?.totalSpent ?? 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {data?.todayExpenses?.length ?? 0} expense(s)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button onClick={() => setIsExpenseOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
                <Button variant="outline" onClick={() => setIsBudgetOpen(true)}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Edit Budget
                </Button>
              </div>

              {/* Today's Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.todayExpenses && data.todayExpenses.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.todayExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{expense.description || 'No description'}</TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No expenses recorded today
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Daily Log History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Days</CardTitle>
                  <CardDescription>Your spending history and carryover</CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.recentLogs && data.recentLogs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Carryover</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">
                              {formatDate(log.date)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(log.dailyBudget)}
                            </TableCell>
                            <TableCell className={`text-right ${
                              log.carryover > 0 ? 'text-green-600' : log.carryover < 0 ? 'text-destructive' : ''
                            }`}>
                              {log.carryover > 0 ? '+' : ''}{formatCurrency(log.carryover)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(log.totalSpent)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${
                              log.remaining < 0 ? 'text-destructive' : 'text-green-600'
                            }`}>
                              {formatCurrency(log.remaining)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
    </div>
  )
}
