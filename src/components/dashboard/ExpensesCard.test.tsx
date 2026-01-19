import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpensesCard } from './ExpensesCard'
import type { ExpenseItem } from './types'

// Mock formatCurrency function
const mockFormatCurrency = (amount: number) => `€${amount.toFixed(2)}`
const mockFormatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to create mock expense
function createMockExpense(overrides: Partial<ExpenseItem> = {}): ExpenseItem {
  return {
    id: 1,
    amount: 25.50,
    description: 'Coffee',
    category: 'food',
    date: '2026-01-15',
    ...overrides,
  }
}

// Helper to create async mock that resolves immediately
const createAsyncMock = () => vi.fn().mockResolvedValue(undefined)

// Helper to create async mock that can be controlled
const createControllableAsyncMock = () => {
  let resolvePromise: () => void
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve
  })
  const mock = vi.fn().mockReturnValue(promise)
  return { mock, resolve: () => resolvePromise() }
}

describe('ExpensesCard', () => {
  const defaultProps = {
    isCurrentMonth: true,
    todayExpenses: [] as ExpenseItem[],
    monthExpenses: [] as ExpenseItem[],
    formatCurrency: mockFormatCurrency,
    formatDate: mockFormatDate,
    onDeleteExpense: createAsyncMock(),
    onEditExpense: vi.fn(),
  }

  describe('rendering', () => {
    it('renders the card with title', () => {
      render(<ExpensesCard {...defaultProps} />)
      expect(screen.getByText("Today's Expenses")).toBeInTheDocument()
    })

    it('shows "Today\'s Expenses" title for current month', () => {
      render(<ExpensesCard {...defaultProps} isCurrentMonth={true} />)
      expect(screen.getByText("Today's Expenses")).toBeInTheDocument()
    })

    it('shows "Month Expenses" title for past month', () => {
      render(<ExpensesCard {...defaultProps} isCurrentMonth={false} />)
      expect(screen.getByText('Month Expenses')).toBeInTheDocument()
    })
  })

  describe('current month - today expenses', () => {
    it('shows empty state when no expenses', () => {
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={[]}
        />
      )
      expect(screen.getByText('No expenses recorded today')).toBeInTheDocument()
    })

    it('shows empty state when todayExpenses is undefined', () => {
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={undefined}
        />
      )
      expect(screen.getByText('No expenses recorded today')).toBeInTheDocument()
    })

    it('renders expense list with descriptions', () => {
      const expenses = [
        createMockExpense({ id: 1, description: 'Coffee', amount: 5.00 }),
        createMockExpense({ id: 2, description: 'Lunch', amount: 15.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      expect(screen.getByText('Coffee')).toBeInTheDocument()
      expect(screen.getByText('Lunch')).toBeInTheDocument()
    })

    it('renders expense amounts', () => {
      const expenses = [
        createMockExpense({ id: 1, amount: 5.50 }),
        createMockExpense({ id: 2, amount: 12.75 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      expect(screen.getByText('€5.50')).toBeInTheDocument()
      expect(screen.getByText('€12.75')).toBeInTheDocument()
    })

    it('renders delete button for each expense', () => {
      const expenses = [
        createMockExpense({ id: 1 }),
        createMockExpense({ id: 2 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      const deleteButtons = screen.getAllByRole('button')
      expect(deleteButtons).toHaveLength(2)
    })

    it('calls onDeleteExpense with correct id when delete button clicked', async () => {
      const user = userEvent.setup()
      const onDeleteExpense = createAsyncMock()
      const expenses = [
        createMockExpense({ id: 42, description: 'Test expense', amount: 10.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
          onDeleteExpense={onDeleteExpense}
        />
      )

      // Click delete button to open confirmation dialog
      const deleteButton = screen.getByRole('button', { name: /delete test expense/i })
      await user.click(deleteButton)

      // Verify confirmation dialog appears
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Delete expense?')).toBeInTheDocument()
      expect(screen.getByText(/Test expense - €10.00/)).toBeInTheDocument()

      // Confirm deletion
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(onDeleteExpense).toHaveBeenCalledWith(42)
    })

    it('uses category label when description is null', () => {
      const expenses = [
        createMockExpense({ id: 1, description: null, category: 'food' }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      expect(screen.getByText('Food & Drinks')).toBeInTheDocument()
    })

    it('renders table headers for today expenses', () => {
      const expenses = [createMockExpense()]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
    })
  })

  describe('delete confirmation dialog', () => {
    it('does not call onDeleteExpense when cancel is clicked', async () => {
      const user = userEvent.setup()
      const onDeleteExpense = createAsyncMock()
      const expenses = [
        createMockExpense({ id: 1, description: 'Coffee', amount: 5.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
          onDeleteExpense={onDeleteExpense}
        />
      )

      // Open confirmation dialog
      await user.click(screen.getByRole('button', { name: /delete coffee/i }))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()

      // Cancel deletion
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onDeleteExpense).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('shows category label in confirmation when description is null', async () => {
      const user = userEvent.setup()
      const expenses = [
        createMockExpense({ id: 1, description: null, category: 'transport', amount: 15.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      await user.click(screen.getByRole('button', { name: /delete transport/i }))

      expect(screen.getByText(/Transport - €15.00/)).toBeInTheDocument()
    })

    it('closes dialog after confirming delete', async () => {
      const user = userEvent.setup()
      const expenses = [
        createMockExpense({ id: 1, description: 'Lunch', amount: 12.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      await user.click(screen.getByRole('button', { name: /delete lunch/i }))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('shows loading spinner while deleting', async () => {
      const user = userEvent.setup()
      const { mock: onDeleteExpense, resolve } = createControllableAsyncMock()
      const expenses = [
        createMockExpense({ id: 1, description: 'Coffee', amount: 5.00 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
          onDeleteExpense={onDeleteExpense}
        />
      )

      // Open confirmation dialog
      await user.click(screen.getByRole('button', { name: /delete coffee/i }))
      
      // Click delete - this will start the async operation
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      // Should show spinner (Delete text should be gone, spinner visible)
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
      
      // Buttons should be disabled
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      
      // Resolve the promise
      resolve()
      
      // Dialog should close after resolution
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('past month - month expenses', () => {
    it('shows empty state when no expenses', () => {
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={[]}
        />
      )
      expect(screen.getByText('No expenses recorded this month')).toBeInTheDocument()
    })

    it('shows empty state when monthExpenses is undefined', () => {
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={undefined}
        />
      )
      expect(screen.getByText('No expenses recorded this month')).toBeInTheDocument()
    })

    it('renders expense list with dates', () => {
      const expenses = [
        createMockExpense({ id: 1, date: '2025-12-15' }),
        createMockExpense({ id: 2, date: '2025-12-20' }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={expenses}
        />
      )

      expect(screen.getByText('Dec 15')).toBeInTheDocument()
      expect(screen.getByText('Dec 20')).toBeInTheDocument()
    })

    it('renders table headers for month expenses including Date', () => {
      const expenses = [createMockExpense()]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={expenses}
        />
      )

      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Amount')).toBeInTheDocument()
    })

    it('does not render delete buttons for past month expenses', () => {
      const expenses = [
        createMockExpense({ id: 1 }),
        createMockExpense({ id: 2 }),
      ]
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={expenses}
        />
      )

      const buttons = screen.queryAllByRole('button')
      expect(buttons).toHaveLength(0)
    })
  })

  describe('expense categories', () => {
    it('renders category icon for food', () => {
      const expenses = [createMockExpense({ category: 'food' })]
      const { container } = render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      // Check that an icon (SVG) is rendered
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('handles various expense categories', () => {
      const categories = ['food', 'transport', 'entertainment', 'shopping', 'bills', 'health', 'other']
      const expenses = categories.map((cat, idx) => 
        createMockExpense({ id: idx + 1, category: cat, description: null })
      )
      
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      // All should render without errors - check for category labels
      expect(screen.getByText('Food & Drinks')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
      expect(screen.getByText('Entertainment')).toBeInTheDocument()
      expect(screen.getByText('Shopping')).toBeInTheDocument()
      expect(screen.getByText('Bills')).toBeInTheDocument()
      expect(screen.getByText('Health')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })
  })

  describe('multiple expenses', () => {
    it('renders all expenses in the list', () => {
      const expenses = Array.from({ length: 5 }, (_, idx) =>
        createMockExpense({ 
          id: idx + 1, 
          description: `Expense ${idx + 1}`,
          amount: (idx + 1) * 10
        })
      )

      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={expenses}
        />
      )

      expenses.forEach((expense) => {
        expect(screen.getByText(expense.description!)).toBeInTheDocument()
      })
    })
  })

  describe('edit expense', () => {
    it('calls onEditExpense when clicking expense description in today expenses', async () => {
      const user = userEvent.setup()
      const onEditExpense = vi.fn()
      const expense = createMockExpense({ id: 42, description: 'Coffee', amount: 5.00 })
      
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={[expense]}
          onEditExpense={onEditExpense}
        />
      )

      await user.click(screen.getByText('Coffee'))
      
      expect(onEditExpense).toHaveBeenCalledWith(expense)
    })

    it('calls onEditExpense when clicking expense description in month expenses', async () => {
      const user = userEvent.setup()
      const onEditExpense = vi.fn()
      const expense = createMockExpense({ id: 42, description: 'Lunch', amount: 12.00 })
      
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={false}
          monthExpenses={[expense]}
          onEditExpense={onEditExpense}
        />
      )

      await user.click(screen.getByText('Lunch'))
      
      expect(onEditExpense).toHaveBeenCalledWith(expense)
    })

    it('calls onEditExpense when clicking category label (no description)', async () => {
      const user = userEvent.setup()
      const onEditExpense = vi.fn()
      const expense = createMockExpense({ id: 42, description: null, category: 'food' })
      
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={[expense]}
          onEditExpense={onEditExpense}
        />
      )

      await user.click(screen.getByText('Food & Drinks'))
      
      expect(onEditExpense).toHaveBeenCalledWith(expense)
    })

    it('expense description has clickable styling', () => {
      const expense = createMockExpense({ description: 'Coffee' })
      
      render(
        <ExpensesCard
          {...defaultProps}
          isCurrentMonth={true}
          todayExpenses={[expense]}
        />
      )

      const descriptionCell = screen.getByText('Coffee')
      expect(descriptionCell).toHaveClass('cursor-pointer')
      expect(descriptionCell).toHaveClass('hover:underline')
    })
  })
})
