import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDialog } from './SettingsDialog'
import type { FixedExpenseItem, IncomeItem, BudgetItem } from './types'

// Mock formatCurrency function
const mockFormatCurrency = (amount: number) => `€${amount.toFixed(2)}`

// Helper to create mock fixed expense
function createMockFixedExpense(overrides: Partial<FixedExpenseItem> = {}): FixedExpenseItem {
  return {
    id: 1,
    name: 'Netflix',
    amount: 15.99,
    ...overrides,
  }
}

// Helper to create mock income
function createMockIncome(overrides: Partial<IncomeItem> = {}): IncomeItem {
  return {
    id: 1,
    amount: 500,
    description: 'Freelance work',
    ...overrides,
  }
}

// Helper to create mock budget
function createMockBudget(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: 1,
    monthlyAmount: 2000,
    month: 1,
    year: 2026,
    startDay: null,
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

describe('SettingsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    budget: createMockBudget(),
    fixedExpenses: [] as FixedExpenseItem[],
    incomes: [] as IncomeItem[],
    totalFixedExpenses: 0,
    totalIncomes: 0,
    formatCurrency: mockFormatCurrency,
    onEditBudget: vi.fn(),
    onAddFixedExpense: vi.fn(),
    onDeleteFixedExpense: createAsyncMock(),
    onDeleteIncome: createAsyncMock(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders dialog when open is true', () => {
      render(<SettingsDialog {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Budget Settings')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(<SettingsDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('displays monthly budget amount', () => {
      render(<SettingsDialog {...defaultProps} budget={createMockBudget({ monthlyAmount: 2500 })} />)
      
      expect(screen.getByText('€2500.00')).toBeInTheDocument()
    })

    it('displays edit budget button', () => {
      render(<SettingsDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Edit Budget' })).toBeInTheDocument()
    })

    it('displays add fixed expense button', () => {
      render(<SettingsDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })
  })

  describe('fixed expenses section', () => {
    it('shows empty state when no fixed expenses', () => {
      render(<SettingsDialog {...defaultProps} fixedExpenses={[]} />)
      
      expect(screen.getByText('No fixed expenses added')).toBeInTheDocument()
    })

    it('renders fixed expenses list', () => {
      const fixedExpenses = [
        createMockFixedExpense({ id: 1, name: 'Netflix', amount: 15.99 }),
        createMockFixedExpense({ id: 2, name: 'Rent', amount: 1000 }),
      ]
      render(<SettingsDialog {...defaultProps} fixedExpenses={fixedExpenses} />)
      
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText('Rent')).toBeInTheDocument()
      expect(screen.getByText('€15.99')).toBeInTheDocument()
      expect(screen.getByText('€1000.00')).toBeInTheDocument()
    })

    it('displays total fixed expenses', () => {
      const fixedExpenses = [createMockFixedExpense()]
      render(<SettingsDialog {...defaultProps} fixedExpenses={fixedExpenses} totalFixedExpenses={500} />)
      
      expect(screen.getByText('€500.00')).toBeInTheDocument()
    })
  })

  describe('incomes section', () => {
    it('shows empty state when no incomes', () => {
      render(<SettingsDialog {...defaultProps} incomes={[]} />)
      
      expect(screen.getByText('No extra money added this month')).toBeInTheDocument()
    })

    it('renders incomes list', () => {
      const incomes = [
        createMockIncome({ id: 1, description: 'Freelance', amount: 500 }),
        createMockIncome({ id: 2, description: 'Bonus', amount: 200 }),
      ]
      render(<SettingsDialog {...defaultProps} incomes={incomes} />)
      
      expect(screen.getByText('Freelance')).toBeInTheDocument()
      expect(screen.getByText('Bonus')).toBeInTheDocument()
    })

    it('displays "No description" for incomes without description', () => {
      const incomes = [createMockIncome({ description: null })]
      render(<SettingsDialog {...defaultProps} incomes={incomes} />)
      
      expect(screen.getByText('No description')).toBeInTheDocument()
    })

    it('displays total incomes', () => {
      const incomes = [createMockIncome()]
      render(<SettingsDialog {...defaultProps} incomes={incomes} totalIncomes={700} />)
      
      expect(screen.getByText('+€700.00')).toBeInTheDocument()
    })
  })

  describe('delete fixed expense confirmation', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      const fixedExpenses = [createMockFixedExpense({ name: 'Netflix', amount: 15.99 })]
      render(<SettingsDialog {...defaultProps} fixedExpenses={fixedExpenses} />)
      
      await user.click(screen.getByRole('button', { name: /delete netflix/i }))
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Delete fixed expense?')).toBeInTheDocument()
      expect(screen.getByText(/Netflix - €15.99/)).toBeInTheDocument()
    })

    it('calls onDeleteFixedExpense when confirmed', async () => {
      const user = userEvent.setup()
      const onDeleteFixedExpense = createAsyncMock()
      const fixedExpenses = [createMockFixedExpense({ id: 42, name: 'Netflix' })]
      render(
        <SettingsDialog
          {...defaultProps}
          fixedExpenses={fixedExpenses}
          onDeleteFixedExpense={onDeleteFixedExpense}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete netflix/i }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      expect(onDeleteFixedExpense).toHaveBeenCalledWith(42)
    })

    it('does not call onDeleteFixedExpense when cancelled', async () => {
      const user = userEvent.setup()
      const onDeleteFixedExpense = createAsyncMock()
      const fixedExpenses = [createMockFixedExpense({ name: 'Netflix' })]
      render(
        <SettingsDialog
          {...defaultProps}
          fixedExpenses={fixedExpenses}
          onDeleteFixedExpense={onDeleteFixedExpense}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete netflix/i }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onDeleteFixedExpense).not.toHaveBeenCalled()
    })

    it('closes confirmation dialog after confirming', async () => {
      const user = userEvent.setup()
      const fixedExpenses = [createMockFixedExpense({ name: 'Netflix' })]
      render(<SettingsDialog {...defaultProps} fixedExpenses={fixedExpenses} />)
      
      await user.click(screen.getByRole('button', { name: /delete netflix/i }))
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('shows loading spinner while deleting fixed expense', async () => {
      const user = userEvent.setup()
      const { mock: onDeleteFixedExpense, resolve } = createControllableAsyncMock()
      const fixedExpenses = [createMockFixedExpense({ name: 'Netflix' })]
      render(
        <SettingsDialog
          {...defaultProps}
          fixedExpenses={fixedExpenses}
          onDeleteFixedExpense={onDeleteFixedExpense}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete netflix/i }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      // Should show spinner (Delete text should be gone)
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      
      resolve()
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('delete income confirmation', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      const incomes = [createMockIncome({ description: 'Freelance work', amount: 500 })]
      render(<SettingsDialog {...defaultProps} incomes={incomes} />)
      
      await user.click(screen.getByRole('button', { name: /delete freelance/i }))
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Delete income?')).toBeInTheDocument()
      expect(screen.getByText(/Freelance work - €500.00/)).toBeInTheDocument()
    })

    it('calls onDeleteIncome when confirmed', async () => {
      const user = userEvent.setup()
      const onDeleteIncome = createAsyncMock()
      const incomes = [createMockIncome({ id: 99, description: 'Bonus' })]
      render(
        <SettingsDialog
          {...defaultProps}
          incomes={incomes}
          onDeleteIncome={onDeleteIncome}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete bonus/i }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      expect(onDeleteIncome).toHaveBeenCalledWith(99)
    })

    it('does not call onDeleteIncome when cancelled', async () => {
      const user = userEvent.setup()
      const onDeleteIncome = createAsyncMock()
      const incomes = [createMockIncome({ description: 'Bonus' })]
      render(
        <SettingsDialog
          {...defaultProps}
          incomes={incomes}
          onDeleteIncome={onDeleteIncome}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete bonus/i }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onDeleteIncome).not.toHaveBeenCalled()
    })

    it('shows "No description" in confirmation for income without description', async () => {
      const user = userEvent.setup()
      const incomes = [createMockIncome({ description: null, amount: 300 })]
      render(<SettingsDialog {...defaultProps} incomes={incomes} />)
      
      await user.click(screen.getByRole('button', { name: /delete income/i }))
      
      expect(screen.getByText(/No description - €300.00/)).toBeInTheDocument()
    })

    it('shows loading spinner while deleting income', async () => {
      const user = userEvent.setup()
      const { mock: onDeleteIncome, resolve } = createControllableAsyncMock()
      const incomes = [createMockIncome({ description: 'Bonus' })]
      render(
        <SettingsDialog
          {...defaultProps}
          incomes={incomes}
          onDeleteIncome={onDeleteIncome}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /delete bonus/i }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      // Should show spinner (Delete text should be gone)
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      
      resolve()
      
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('button interactions', () => {
    it('calls onEditBudget when Edit Budget button is clicked', async () => {
      const user = userEvent.setup()
      const onEditBudget = vi.fn()
      render(<SettingsDialog {...defaultProps} onEditBudget={onEditBudget} />)
      
      await user.click(screen.getByRole('button', { name: 'Edit Budget' }))
      
      expect(onEditBudget).toHaveBeenCalledTimes(1)
    })

    it('calls onAddFixedExpense when Add button is clicked', async () => {
      const user = userEvent.setup()
      const onAddFixedExpense = vi.fn()
      render(<SettingsDialog {...defaultProps} onAddFixedExpense={onAddFixedExpense} />)
      
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      expect(onAddFixedExpense).toHaveBeenCalledTimes(1)
    })

    it('calls onOpenChange(false) when Close button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<SettingsDialog {...defaultProps} onOpenChange={onOpenChange} />)
      
      // Get the Close button in the dialog footer (not the X button)
      const closeButtons = screen.getAllByRole('button', { name: 'Close' })
      const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close')
      expect(footerCloseButton).toBeDefined()
      await user.click(footerCloseButton!)
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('null/undefined handling', () => {
    it('displays €0.00 when budget is null', () => {
      render(<SettingsDialog {...defaultProps} budget={null} />)
      
      expect(screen.getByText('€0.00')).toBeInTheDocument()
    })

    it('displays €0.00 when budget is undefined', () => {
      render(<SettingsDialog {...defaultProps} budget={undefined} />)
      
      expect(screen.getByText('€0.00')).toBeInTheDocument()
    })

    it('shows empty state when fixedExpenses is undefined', () => {
      render(<SettingsDialog {...defaultProps} fixedExpenses={undefined} />)
      
      expect(screen.getByText('No fixed expenses added')).toBeInTheDocument()
    })

    it('shows empty state when incomes is undefined', () => {
      render(<SettingsDialog {...defaultProps} incomes={undefined} />)
      
      expect(screen.getByText('No extra money added this month')).toBeInTheDocument()
    })
  })
})
