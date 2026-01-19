import type { ExpenseCategory } from '@/db/schema'
import type { Utensils } from 'lucide-react'

/**
 * Dashboard shared types
 */

// Category configuration for expense display
export type CategoryConfig = {
  label: string
  icon: typeof Utensils
  color: string
}

export type CategoryConfigMap = Record<ExpenseCategory, CategoryConfig>

// Currency type
export type Currency = 'USD' | 'EUR'

// Format functions type
export type FormatCurrencyFn = (amount: number) => string
export type FormatDateFn = (dateStr: string) => string

// Expense item type (from database)
export type ExpenseItem = {
  id: number
  amount: number
  description: string | null
  category: string | null
  date: string
}

// Daily log type (from database)
export type DailyLogItem = {
  id: number
  date: string
  dailyBudget: number
  carryover: number
  totalSpent: number
  remaining: number
}

// Fixed expense type (from database)
export type FixedExpenseItem = {
  id: number
  name: string
  amount: number
}

// Income type (from database)
export type IncomeItem = {
  id: number
  amount: number
  description: string | null
}

// Budget type (from database)
export type BudgetItem = {
  id: number
  monthlyAmount: number
  month: number
  year: number
  startDay: number | null
}

// Budget period type
export type BudgetPeriod = {
  month: number
  year: number
  startDate: string
  endDate: string
  daysInPeriod: number
}
