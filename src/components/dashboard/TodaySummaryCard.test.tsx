import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodaySummaryCard } from './TodaySummaryCard'
import type { DailyLogItem } from './types'

// Mock formatCurrency function
const mockFormatCurrency = (amount: number) => `€${amount.toFixed(2)}`

// Helper to create mock daily log
function createMockDailyLog(overrides: Partial<DailyLogItem> = {}): DailyLogItem {
  return {
    id: 1,
    date: '2026-01-15',
    dailyBudget: 33.33,
    carryover: 0,
    totalSpent: 0,
    remaining: 33.33,
    ...overrides,
  }
}

describe('TodaySummaryCard', () => {
  describe('rendering', () => {
    it('renders the card with basic structure', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog()}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText('Available Today')).toBeInTheDocument()
      expect(screen.getByText('Budget')).toBeInTheDocument()
      expect(screen.getByText('Spent')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
    })

    it('renders the cover image', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog()}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      const img = screen.getByAltText('Daily Budget')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/cover.png')
    })

    it('includes the BudgetProgressCircle', () => {
      const onSettingsClick = vi.fn()
      const { container } = render(
        <TodaySummaryCard
          todayLog={createMockDailyLog()}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('budget display - under budget', () => {
    it('displays correct remaining amount', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ remaining: 25.50 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText('€25.50')).toBeInTheDocument()
    })

    it('displays daily budget correctly', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog()}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      // Daily budget appears both as "Available Today" (remaining) and "Budget"
      const budgetElements = screen.getAllByText('€33.33')
      expect(budgetElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays spent amount correctly', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ totalSpent: 10.00 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText('€10.00')).toBeInTheDocument()
    })

    it('applies green color when under budget', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ remaining: 25.50 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      const remainingElement = screen.getByText('€25.50')
      expect(remainingElement).toHaveClass('text-green-600')
    })
  })

  describe('budget display - overspent', () => {
    it('displays negative remaining amount', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ remaining: -10.50 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText('€-10.50')).toBeInTheDocument()
    })

    it('applies destructive color when overspent', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ remaining: -10.50 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      const remainingElement = screen.getByText('€-10.50')
      expect(remainingElement).toHaveClass('text-destructive')
    })
  })

  describe('carryover display', () => {
    it('shows positive carryover with TrendingUp icon', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ carryover: 15.00 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText(/\+€15\.00 carried/)).toBeInTheDocument()
    })

    it('shows negative carryover as debt with TrendingDown icon', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ carryover: -10.00 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText(/€-10\.00 debt/)).toBeInTheDocument()
    })

    it('does not show carryover when zero', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog({ carryover: 0 })}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.queryByText(/carried/)).not.toBeInTheDocument()
      expect(screen.queryByText(/debt/)).not.toBeInTheDocument()
    })

    it('does not show carryover when todayLog is null', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={null}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.queryByText(/carried/)).not.toBeInTheDocument()
      expect(screen.queryByText(/debt/)).not.toBeInTheDocument()
    })
  })

  describe('null/undefined todayLog handling', () => {
    it('displays dailyBudget as remaining when todayLog is null', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={null}
          dailyBudget={50.00}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      // dailyBudget appears both as "Available Today" (remaining) and "Budget"
      const budgetElements = screen.getAllByText('€50.00')
      expect(budgetElements.length).toBe(2) // Once for remaining, once for budget
    })

    it('displays zero spent when todayLog is null', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={null}
          dailyBudget={50.00}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      expect(screen.getByText('€0.00')).toBeInTheDocument()
    })

    it('displays dailyBudget as remaining when todayLog is undefined', () => {
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={undefined}
          dailyBudget={50.00}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      // dailyBudget appears both as "Available Today" (remaining) and "Budget"
      const budgetElements = screen.getAllByText('€50.00')
      expect(budgetElements.length).toBe(2)
    })
  })

  describe('settings button', () => {
    it('calls onSettingsClick when clicked', async () => {
      const user = userEvent.setup()
      const onSettingsClick = vi.fn()
      render(
        <TodaySummaryCard
          todayLog={createMockDailyLog()}
          dailyBudget={33.33}
          formatCurrency={mockFormatCurrency}
          onSettingsClick={onSettingsClick}
        />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      await user.click(settingsButton)

      expect(onSettingsClick).toHaveBeenCalledTimes(1)
    })
  })
})
