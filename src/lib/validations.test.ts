import { describe, it, expect } from 'vitest'
import {
  // Primitives
  monthSchema,
  yearSchema,
  startDaySchema,
  positiveAmountSchema,
  emailSchema,
  passwordSchema,
  loginPasswordSchema,
  roleSchema,
  currencySchema,
  // Auth schemas
  loginSchema,
  // User schemas
  createUserSchema,
  updateUserSchema,
  // Budget schemas
  setBudgetSchema,
  updateMonthStartDaySchema,
  // Expense schemas
  addExpenseSchema,
  addFixedExpenseSchema,
  // Income schemas
  addIncomeSchema,
  // Search params
  dashboardSearchParamsSchema,
} from './validations'

describe('primitives', () => {
  describe('monthSchema', () => {
    it('accepts valid months (1-12)', () => {
      for (let month = 1; month <= 12; month++) {
        expect(monthSchema.parse(month)).toBe(month)
      }
    })

    it('rejects month < 1', () => {
      expect(() => monthSchema.parse(0)).toThrow()
      expect(() => monthSchema.parse(-1)).toThrow()
    })

    it('rejects month > 12', () => {
      expect(() => monthSchema.parse(13)).toThrow()
      expect(() => monthSchema.parse(100)).toThrow()
    })

    it('rejects non-integers', () => {
      expect(() => monthSchema.parse(1.5)).toThrow()
      expect(() => monthSchema.parse(6.7)).toThrow()
    })
  })

  describe('yearSchema', () => {
    it('accepts valid years (2020-2100)', () => {
      expect(yearSchema.parse(2020)).toBe(2020)
      expect(yearSchema.parse(2026)).toBe(2026)
      expect(yearSchema.parse(2100)).toBe(2100)
    })

    it('rejects years outside range', () => {
      expect(() => yearSchema.parse(2019)).toThrow()
      expect(() => yearSchema.parse(2101)).toThrow()
    })
  })

  describe('startDaySchema', () => {
    it('accepts valid start days (1-28)', () => {
      for (let day = 1; day <= 28; day++) {
        expect(startDaySchema.parse(day)).toBe(day)
      }
    })

    it('rejects day < 1', () => {
      expect(() => startDaySchema.parse(0)).toThrow()
    })

    it('rejects day > 28', () => {
      expect(() => startDaySchema.parse(29)).toThrow()
      expect(() => startDaySchema.parse(31)).toThrow()
    })
  })

  describe('positiveAmountSchema', () => {
    it('accepts positive numbers', () => {
      expect(positiveAmountSchema.parse(1)).toBe(1)
      expect(positiveAmountSchema.parse(100.50)).toBe(100.50)
      expect(positiveAmountSchema.parse(0.01)).toBe(0.01)
    })

    it('rejects zero', () => {
      expect(() => positiveAmountSchema.parse(0)).toThrow()
    })

    it('rejects negative numbers', () => {
      expect(() => positiveAmountSchema.parse(-1)).toThrow()
      expect(() => positiveAmountSchema.parse(-100.50)).toThrow()
    })
  })

  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.parse('user@example.com')).toBe('user@example.com')
      expect(emailSchema.parse('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk')
    })

    it('rejects invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow()
      expect(() => emailSchema.parse('missing@domain')).toThrow()
      expect(() => emailSchema.parse('@example.com')).toThrow()
      expect(() => emailSchema.parse('')).toThrow()
    })
  })

  describe('passwordSchema', () => {
    it('accepts passwords with 6+ characters', () => {
      expect(passwordSchema.parse('123456')).toBe('123456')
      expect(passwordSchema.parse('securePassword')).toBe('securePassword')
    })

    it('rejects passwords with < 6 characters', () => {
      expect(() => passwordSchema.parse('12345')).toThrow()
      expect(() => passwordSchema.parse('')).toThrow()
    })
  })

  describe('loginPasswordSchema', () => {
    it('accepts any non-empty password', () => {
      expect(loginPasswordSchema.parse('a')).toBe('a')
      expect(loginPasswordSchema.parse('short')).toBe('short')
    })

    it('rejects empty password', () => {
      expect(() => loginPasswordSchema.parse('')).toThrow()
    })
  })

  describe('roleSchema', () => {
    it('accepts valid roles', () => {
      expect(roleSchema.parse('user')).toBe('user')
      expect(roleSchema.parse('admin')).toBe('admin')
    })

    it('rejects invalid roles', () => {
      expect(() => roleSchema.parse('superadmin')).toThrow()
      expect(() => roleSchema.parse('guest')).toThrow()
      expect(() => roleSchema.parse('')).toThrow()
    })
  })

  describe('currencySchema', () => {
    it('accepts 3-letter codes and uppercases them', () => {
      expect(currencySchema.parse('usd')).toBe('USD')
      expect(currencySchema.parse('EUR')).toBe('EUR')
      expect(currencySchema.parse('Gbp')).toBe('GBP')
    })

    it('rejects codes not exactly 3 characters', () => {
      expect(() => currencySchema.parse('US')).toThrow()
      expect(() => currencySchema.parse('USDD')).toThrow()
      expect(() => currencySchema.parse('')).toThrow()
    })
  })
})

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'mypassword',
    })
    expect(result.email).toBe('user@example.com')
    expect(result.password).toBe('mypassword')
  })

  it('accepts optional rememberMe', () => {
    const result = loginSchema.parse({
      email: 'user@example.com',
      password: 'mypassword',
      rememberMe: true,
    })
    expect(result.rememberMe).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(() =>
      loginSchema.parse({
        email: 'invalid',
        password: 'mypassword',
      }),
    ).toThrow()
  })

  it('rejects empty password', () => {
    expect(() =>
      loginSchema.parse({
        email: 'user@example.com',
        password: '',
      }),
    ).toThrow()
  })
})

describe('createUserSchema', () => {
  it('accepts valid user data', () => {
    const result = createUserSchema.parse({
      email: 'newuser@example.com',
      password: 'securepassword',
      role: 'user',
    })
    expect(result.email).toBe('newuser@example.com')
    expect(result.role).toBe('user')
  })

  it('accepts admin role', () => {
    const result = createUserSchema.parse({
      email: 'admin@example.com',
      password: 'adminpass',
      role: 'admin',
    })
    expect(result.role).toBe('admin')
  })

  it('rejects short password', () => {
    expect(() =>
      createUserSchema.parse({
        email: 'user@example.com',
        password: '12345',
        role: 'user',
      }),
    ).toThrow()
  })

  it('rejects invalid role', () => {
    expect(() =>
      createUserSchema.parse({
        email: 'user@example.com',
        password: 'securepassword',
        role: 'superadmin',
      }),
    ).toThrow()
  })
})

describe('updateUserSchema', () => {
  it('accepts valid update data', () => {
    const result = updateUserSchema.parse({
      id: 1,
      email: 'updated@example.com',
      role: 'admin',
    })
    expect(result.id).toBe(1)
    expect(result.email).toBe('updated@example.com')
  })

  it('accepts optional password', () => {
    const result = updateUserSchema.parse({
      id: 1,
      email: 'user@example.com',
      password: 'newpassword',
      role: 'user',
    })
    expect(result.password).toBe('newpassword')
  })

  it('rejects invalid id', () => {
    expect(() =>
      updateUserSchema.parse({
        id: 0,
        email: 'user@example.com',
        role: 'user',
      }),
    ).toThrow()
    expect(() =>
      updateUserSchema.parse({
        id: -1,
        email: 'user@example.com',
        role: 'user',
      }),
    ).toThrow()
  })
})

describe('setBudgetSchema', () => {
  it('accepts valid budget data', () => {
    const result = setBudgetSchema.parse({
      monthlyAmount: 1000,
      month: 1,
      year: 2026,
    })
    expect(result.monthlyAmount).toBe(1000)
    expect(result.month).toBe(1)
    expect(result.year).toBe(2026)
  })

  it('accepts optional startDay', () => {
    const result = setBudgetSchema.parse({
      monthlyAmount: 1000,
      month: 1,
      year: 2026,
      startDay: 15,
    })
    expect(result.startDay).toBe(15)
  })

  it('accepts null startDay', () => {
    const result = setBudgetSchema.parse({
      monthlyAmount: 1000,
      month: 1,
      year: 2026,
      startDay: null,
    })
    expect(result.startDay).toBeNull()
  })

  it('rejects zero or negative amount', () => {
    expect(() =>
      setBudgetSchema.parse({
        monthlyAmount: 0,
        month: 1,
        year: 2026,
      }),
    ).toThrow()
    expect(() =>
      setBudgetSchema.parse({
        monthlyAmount: -100,
        month: 1,
        year: 2026,
      }),
    ).toThrow()
  })

  it('rejects invalid month', () => {
    expect(() =>
      setBudgetSchema.parse({
        monthlyAmount: 1000,
        month: 13,
        year: 2026,
      }),
    ).toThrow()
  })

  it('rejects invalid startDay', () => {
    expect(() =>
      setBudgetSchema.parse({
        monthlyAmount: 1000,
        month: 1,
        year: 2026,
        startDay: 29,
      }),
    ).toThrow()
  })
})

describe('updateMonthStartDaySchema', () => {
  it('accepts valid start day', () => {
    const result = updateMonthStartDaySchema.parse({ monthStartDay: 15 })
    expect(result.monthStartDay).toBe(15)
  })

  it('rejects invalid start day', () => {
    expect(() => updateMonthStartDaySchema.parse({ monthStartDay: 0 })).toThrow()
    expect(() => updateMonthStartDaySchema.parse({ monthStartDay: 29 })).toThrow()
  })
})

describe('addExpenseSchema', () => {
  it('accepts valid expense data', () => {
    const result = addExpenseSchema.parse({
      amount: 50.99,
    })
    expect(result.amount).toBe(50.99)
  })

  it('accepts optional description', () => {
    const result = addExpenseSchema.parse({
      amount: 50,
      description: 'Groceries',
    })
    expect(result.description).toBe('Groceries')
  })

  it('accepts optional date', () => {
    const result = addExpenseSchema.parse({
      amount: 50,
      date: '2026-01-15',
    })
    expect(result.date).toBe('2026-01-15')
  })

  it('rejects zero or negative amount', () => {
    expect(() => addExpenseSchema.parse({ amount: 0 })).toThrow()
    expect(() => addExpenseSchema.parse({ amount: -10 })).toThrow()
  })
})

describe('addFixedExpenseSchema', () => {
  it('accepts valid fixed expense data', () => {
    const result = addFixedExpenseSchema.parse({
      name: 'Rent',
      amount: 1200,
    })
    expect(result.name).toBe('Rent')
    expect(result.amount).toBe(1200)
  })

  it('rejects empty name', () => {
    expect(() =>
      addFixedExpenseSchema.parse({
        name: '',
        amount: 100,
      }),
    ).toThrow()
  })

  it('rejects zero or negative amount', () => {
    expect(() =>
      addFixedExpenseSchema.parse({
        name: 'Utilities',
        amount: 0,
      }),
    ).toThrow()
  })
})

describe('addIncomeSchema', () => {
  it('accepts valid income data', () => {
    const result = addIncomeSchema.parse({
      amount: 5000,
    })
    expect(result.amount).toBe(5000)
  })

  it('accepts optional fields', () => {
    const result = addIncomeSchema.parse({
      amount: 5000,
      description: 'Salary',
      date: '2026-01-01',
    })
    expect(result.description).toBe('Salary')
    expect(result.date).toBe('2026-01-01')
  })

  it('rejects zero or negative amount', () => {
    expect(() => addIncomeSchema.parse({ amount: 0 })).toThrow()
    expect(() => addIncomeSchema.parse({ amount: -500 })).toThrow()
  })
})

describe('dashboardSearchParamsSchema', () => {
  it('accepts empty params', () => {
    const result = dashboardSearchParamsSchema.parse({})
    expect(result.month).toBeUndefined()
    expect(result.year).toBeUndefined()
  })

  it('accepts valid month and year', () => {
    const result = dashboardSearchParamsSchema.parse({
      month: 6,
      year: 2026,
    })
    expect(result.month).toBe(6)
    expect(result.year).toBe(2026)
  })

  it('accepts partial params', () => {
    const result1 = dashboardSearchParamsSchema.parse({ month: 3 })
    expect(result1.month).toBe(3)
    expect(result1.year).toBeUndefined()

    const result2 = dashboardSearchParamsSchema.parse({ year: 2025 })
    expect(result2.month).toBeUndefined()
    expect(result2.year).toBe(2025)
  })

  it('rejects invalid month', () => {
    expect(() => dashboardSearchParamsSchema.parse({ month: 0 })).toThrow()
    expect(() => dashboardSearchParamsSchema.parse({ month: 13 })).toThrow()
  })

  it('rejects invalid year', () => {
    expect(() => dashboardSearchParamsSchema.parse({ year: 1999 })).toThrow()
    expect(() => dashboardSearchParamsSchema.parse({ year: 2200 })).toThrow()
  })
})
