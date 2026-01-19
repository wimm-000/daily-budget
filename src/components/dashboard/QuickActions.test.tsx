import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickActions, BudgetCopiedNotice, NoBudgetCard } from './QuickActions'

describe('QuickActions', () => {
  describe('rendering', () => {
    it('renders Add Expense button', () => {
      render(
        <QuickActions
          onAddExpense={vi.fn()}
          onAddIncome={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /add expense/i })).toBeInTheDocument()
    })

    it('renders Add Money button', () => {
      render(
        <QuickActions
          onAddExpense={vi.fn()}
          onAddIncome={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /add money/i })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onAddExpense when Add Expense button is clicked', async () => {
      const user = userEvent.setup()
      const onAddExpense = vi.fn()
      render(
        <QuickActions
          onAddExpense={onAddExpense}
          onAddIncome={vi.fn()}
        />
      )

      await user.click(screen.getByRole('button', { name: /add expense/i }))

      expect(onAddExpense).toHaveBeenCalledTimes(1)
    })

    it('calls onAddIncome when Add Money button is clicked', async () => {
      const user = userEvent.setup()
      const onAddIncome = vi.fn()
      render(
        <QuickActions
          onAddExpense={vi.fn()}
          onAddIncome={onAddIncome}
        />
      )

      await user.click(screen.getByRole('button', { name: /add money/i }))

      expect(onAddIncome).toHaveBeenCalledTimes(1)
    })
  })
})

describe('BudgetCopiedNotice', () => {
  describe('rendering', () => {
    it('renders the notice message', () => {
      render(<BudgetCopiedNotice onEditBudget={vi.fn()} />)
      expect(
        screen.getByText(/your monthly budget was automatically copied from last month/i)
      ).toBeInTheDocument()
    })

    it('renders Edit budget link', () => {
      render(<BudgetCopiedNotice onEditBudget={vi.fn()} />)
      expect(screen.getByRole('button', { name: /edit budget/i })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onEditBudget when Edit budget link is clicked', async () => {
      const user = userEvent.setup()
      const onEditBudget = vi.fn()
      render(<BudgetCopiedNotice onEditBudget={onEditBudget} />)

      await user.click(screen.getByRole('button', { name: /edit budget/i }))

      expect(onEditBudget).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('has info/notice styling classes', () => {
      const { container } = render(<BudgetCopiedNotice onEditBudget={vi.fn()} />)
      const noticeDiv = container.firstChild as HTMLElement
      expect(noticeDiv).toHaveClass('bg-blue-50')
      expect(noticeDiv).toHaveClass('border-blue-200')
    })
  })
})

describe('NoBudgetCard', () => {
  describe('current month - rendering', () => {
    it('renders welcome title for current month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={true}
          formattedMonthYear="January 2026"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.getByText('Welcome to Daily Budget')).toBeInTheDocument()
    })

    it('renders description for current month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={true}
          formattedMonthYear="January 2026"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.getByText('Set your monthly budget to get started')).toBeInTheDocument()
    })

    it('renders Set Monthly Budget button for current month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={true}
          formattedMonthYear="January 2026"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /set monthly budget/i })).toBeInTheDocument()
    })
  })

  describe('past month - rendering', () => {
    it('renders "No Budget Data" title for past month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={false}
          formattedMonthYear="December 2025"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.getByText('No Budget Data')).toBeInTheDocument()
    })

    it('renders description with month name for past month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={false}
          formattedMonthYear="December 2025"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.getByText('No budget was set for December 2025')).toBeInTheDocument()
    })

    it('does not render Set Monthly Budget button for past month', () => {
      render(
        <NoBudgetCard
          isCurrentMonth={false}
          formattedMonthYear="December 2025"
          onSetBudget={vi.fn()}
        />
      )
      expect(screen.queryByRole('button', { name: /set monthly budget/i })).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onSetBudget when Set Monthly Budget button is clicked', async () => {
      const user = userEvent.setup()
      const onSetBudget = vi.fn()
      render(
        <NoBudgetCard
          isCurrentMonth={true}
          formattedMonthYear="January 2026"
          onSetBudget={onSetBudget}
        />
      )

      await user.click(screen.getByRole('button', { name: /set monthly budget/i }))

      expect(onSetBudget).toHaveBeenCalledTimes(1)
    })
  })
})
