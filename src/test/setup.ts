import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/i18n/locales/en.json'

// Initialize i18n for tests
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
})

// MSW server instance for API mocking
export const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup() // Clean up React Testing Library after each test
})

afterAll(() => {
  server.close()
})

// Type definitions for mock data
export type MockUser = {
  id: number
  email: string
  password: string
  role: 'user' | 'admin'
  currency: 'USD' | 'EUR'
  monthStartDay: number
  avatar: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

export type MockBudget = {
  id: number
  userId: number
  monthlyAmount: number
  month: number
  year: number
  startDay: number | null
  createdAt: Date | null
}

export type MockExpense = {
  id: number
  userId: number
  amount: number
  description: string | null
  category: 'food' | 'transport' | 'entertainment' | 'shopping' | 'bills' | 'health' | 'other'
  date: string
  createdAt: Date | null
}

export type MockDailyLog = {
  id: number
  userId: number
  date: string
  dailyBudget: number
  carryover: number
  totalSpent: number
  remaining: number
  createdAt: Date | null
}

export type MockFixedExpense = {
  id: number
  userId: number
  name: string
  amount: number
  createdAt: Date | null
}

export type MockIncome = {
  id: number
  userId: number
  amount: number
  description: string | null
  month: number
  year: number
  createdAt: Date | null
}

// Helper to create mock user
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user',
    currency: 'EUR',
    monthStartDay: 1,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Helper to create mock budget
export function createMockBudget(overrides: Partial<MockBudget> = {}): MockBudget {
  return {
    id: 1,
    userId: 1,
    monthlyAmount: 1000,
    month: 1,
    year: 2026,
    startDay: null,
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create mock expense
export function createMockExpense(overrides: Partial<MockExpense> = {}): MockExpense {
  return {
    id: 1,
    userId: 1,
    amount: 25.50,
    description: 'Coffee',
    category: 'food',
    date: '2026-01-15',
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create mock daily log
export function createMockDailyLog(overrides: Partial<MockDailyLog> = {}): MockDailyLog {
  return {
    id: 1,
    userId: 1,
    date: '2026-01-15',
    dailyBudget: 33.33,
    carryover: 0,
    totalSpent: 0,
    remaining: 33.33,
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create mock fixed expense
export function createMockFixedExpense(overrides: Partial<MockFixedExpense> = {}): MockFixedExpense {
  return {
    id: 1,
    userId: 1,
    name: 'Rent',
    amount: 500,
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create mock income
export function createMockIncome(overrides: Partial<MockIncome> = {}): MockIncome {
  return {
    id: 1,
    userId: 1,
    amount: 500,
    description: 'Bonus',
    month: 1,
    year: 2026,
    createdAt: new Date(),
    ...overrides,
  }
}
