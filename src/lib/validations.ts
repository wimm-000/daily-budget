import { z } from 'zod'

// =============================================================================
// Shared validation primitives
// =============================================================================

/** Valid budget period month (1-12) */
export const monthSchema = z.number().int().min(1).max(12)

/** Valid budget period year */
export const yearSchema = z.number().int().min(2020).max(2100)

/** Valid start day for budget periods (1-28 to handle all months) */
export const startDaySchema = z.number().int().min(1).max(28)

/** Positive monetary amount */
export const positiveAmountSchema = z.number().positive()

/** Email validation */
export const emailSchema = z.string().email('Invalid email address')

/** Password with minimum length */
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters')

/** Password for login (just required, no min length) */
export const loginPasswordSchema = z.string().min(1, 'Password is required')

/** User role enum */
export const roleSchema = z.enum(['user', 'admin'])

/** Currency code (3-letter uppercase) */
export const currencySchema = z.string().length(3).toUpperCase()

// =============================================================================
// Auth schemas
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  rememberMe: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>

// =============================================================================
// User management schemas
// =============================================================================

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  id: z.number().int().positive(),
  email: emailSchema,
  password: z.string().optional(),
  role: roleSchema,
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

// =============================================================================
// Budget schemas
// =============================================================================

export const setBudgetSchema = z.object({
  monthlyAmount: positiveAmountSchema,
  month: monthSchema,
  year: yearSchema,
  startDay: startDaySchema.nullable().optional(),
})

export type SetBudgetInput = z.infer<typeof setBudgetSchema>

export const updateMonthStartDaySchema = z.object({
  monthStartDay: startDaySchema,
})

export type UpdateMonthStartDayInput = z.infer<typeof updateMonthStartDaySchema>

export const updateCurrencySchema = z.object({
  currency: currencySchema,
})

export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>

// =============================================================================
// Expense schemas
// =============================================================================

export const addExpenseSchema = z.object({
  amount: positiveAmountSchema,
  description: z.string().optional(),
  date: z.string().optional(), // ISO date string
})

export type AddExpenseInput = z.infer<typeof addExpenseSchema>

export const addFixedExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: positiveAmountSchema,
})

export type AddFixedExpenseInput = z.infer<typeof addFixedExpenseSchema>

// =============================================================================
// Income schemas
// =============================================================================

export const addIncomeSchema = z.object({
  amount: positiveAmountSchema,
  description: z.string().optional(),
  date: z.string().optional(), // ISO date string
})

export type AddIncomeInput = z.infer<typeof addIncomeSchema>

// =============================================================================
// Search params schemas
// =============================================================================

export const dashboardSearchParamsSchema = z.object({
  month: monthSchema.optional(),
  year: yearSchema.optional(),
})

export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>
