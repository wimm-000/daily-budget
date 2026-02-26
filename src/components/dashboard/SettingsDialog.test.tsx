import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDialog } from './SettingsDialog'
import type { FixedExpenseItem, BudgetItem } from './types'

const mockFormatCurrency = (amount: number) => `€${amount.toFixed(2)}`

function createMockFixedExpense(overrides: Partial<FixedExpenseItem> = {}): FixedExpenseItem {
  return {
    id: 1,
    name: 'Netflix',
    amount: 15.99,
    ...overrides,
  }
}

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

const createAsyncMock = () => vi.fn().mockResolvedValue(undefined)

describe('SettingsDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    budget: createMockBudget(),
    fixedExpenses: [] as FixedExpenseItem[],
    totalFixedExpenses: 0,
    formatCurrency: mockFormatCurrency,
    onEditBudget: vi.fn(),
    onAddFixedExpense: vi.fn(),
    onDeleteFixedExpense: createAsyncMock(),
    onEditFixedExpense: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with budget section', () => {
    render(<SettingsDialog {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Budget Settings')).toBeInTheDocument()
    expect(screen.getByText('€2000.00')).toBeInTheDocument()
  })

  it('shows empty state when no fixed expenses', () => {
    render(<SettingsDialog {...defaultProps} fixedExpenses={[]} />)

    expect(screen.getByText('No fixed expenses added')).toBeInTheDocument()
  })

  it('renders fixed expenses and total', () => {
    const fixedExpenses = [
      createMockFixedExpense({ id: 1, name: 'Netflix', amount: 15.99 }),
      createMockFixedExpense({ id: 2, name: 'Rent', amount: 1000 }),
    ]

    render(
      <SettingsDialog
        {...defaultProps}
        fixedExpenses={fixedExpenses}
        totalFixedExpenses={1015.99}
      />
    )

    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
    expect(screen.getByText('€1015.99')).toBeInTheDocument()
  })

  it('calls onEditBudget when clicking Edit Budget', async () => {
    const user = userEvent.setup()
    const onEditBudget = vi.fn()

    render(<SettingsDialog {...defaultProps} onEditBudget={onEditBudget} />)

    await user.click(screen.getByRole('button', { name: 'Edit Budget' }))

    expect(onEditBudget).toHaveBeenCalledTimes(1)
  })

  it('calls onAddFixedExpense when clicking Add', async () => {
    const user = userEvent.setup()
    const onAddFixedExpense = vi.fn()

    render(<SettingsDialog {...defaultProps} onAddFixedExpense={onAddFixedExpense} />)

    await user.click(screen.getByRole('button', { name: /add/i }))

    expect(onAddFixedExpense).toHaveBeenCalledTimes(1)
  })

  it('calls onEditFixedExpense when clicking fixed expense name', async () => {
    const user = userEvent.setup()
    const onEditFixedExpense = vi.fn()
    const fixedExpense = createMockFixedExpense({ id: 42, name: 'Netflix' })

    render(
      <SettingsDialog
        {...defaultProps}
        fixedExpenses={[fixedExpense]}
        onEditFixedExpense={onEditFixedExpense}
      />
    )

    await user.click(screen.getByText('Netflix'))

    expect(onEditFixedExpense).toHaveBeenCalledWith(fixedExpense)
  })

  it('deletes fixed expense after confirmation', async () => {
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

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })
})
