import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddedMoneyCard } from './AddedMoneyCard'
import type { IncomeItem } from './types'

const mockFormatCurrency = (amount: number) => `€${amount.toFixed(2)}`

function createMockIncome(overrides: Partial<IncomeItem> = {}): IncomeItem {
  return {
    id: 1,
    amount: 500,
    description: 'Freelance work',
    ...overrides,
  }
}

const createAsyncMock = () => vi.fn().mockResolvedValue(undefined)

describe('AddedMoneyCard', () => {
  const defaultProps = {
    incomes: [] as IncomeItem[],
    totalIncomes: 0,
    isCurrentMonth: true,
    formatCurrency: mockFormatCurrency,
    onAddIncome: vi.fn(),
    onEditIncome: vi.fn(),
    onDeleteIncome: createAsyncMock(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title, description and add button in current month', () => {
    render(<AddedMoneyCard {...defaultProps} />)

    expect(screen.getByText('Added Money This Month')).toBeInTheDocument()
    expect(screen.getByText("Extra income added to this month's budget")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('does not show add button in past month', () => {
    render(<AddedMoneyCard {...defaultProps} isCurrentMonth={false} />)

    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('shows empty state when incomes is empty', () => {
    render(<AddedMoneyCard {...defaultProps} incomes={[]} />)

    expect(screen.getByText('No extra money added this month')).toBeInTheDocument()
  })

  it('shows empty state when incomes is undefined', () => {
    render(<AddedMoneyCard {...defaultProps} incomes={undefined} />)

    expect(screen.getByText('No extra money added this month')).toBeInTheDocument()
  })

  it('renders incomes list and total', () => {
    const incomes = [
      createMockIncome({ id: 1, description: 'Freelance', amount: 500 }),
      createMockIncome({ id: 2, description: 'Bonus', amount: 200 }),
    ]

    render(<AddedMoneyCard {...defaultProps} incomes={incomes} totalIncomes={700} />)

    expect(screen.getByText('Freelance')).toBeInTheDocument()
    expect(screen.getByText('Bonus')).toBeInTheDocument()
    expect(screen.getByText('+€500.00')).toBeInTheDocument()
    expect(screen.getByText('+€200.00')).toBeInTheDocument()
    expect(screen.getByText('+€700.00')).toBeInTheDocument()
  })

  it('displays fallback text when income description is null', () => {
    const incomes = [createMockIncome({ description: null })]

    render(<AddedMoneyCard {...defaultProps} incomes={incomes} totalIncomes={500} />)

    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('calls onAddIncome when Add button is clicked', async () => {
    const user = userEvent.setup()
    const onAddIncome = vi.fn()

    render(<AddedMoneyCard {...defaultProps} onAddIncome={onAddIncome} />)

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onAddIncome).toHaveBeenCalledTimes(1)
  })

  it('calls onEditIncome when clicking income description in current month', async () => {
    const user = userEvent.setup()
    const onEditIncome = vi.fn()
    const income = createMockIncome({ id: 42, description: 'Freelance work' })

    render(<AddedMoneyCard {...defaultProps} incomes={[income]} onEditIncome={onEditIncome} />)

    await user.click(screen.getByText('Freelance work'))

    expect(onEditIncome).toHaveBeenCalledWith(income)
  })

  it('does not call onEditIncome in past month', async () => {
    const user = userEvent.setup()
    const onEditIncome = vi.fn()
    const income = createMockIncome({ id: 42, description: 'Freelance work' })

    render(
      <AddedMoneyCard
        {...defaultProps}
        isCurrentMonth={false}
        incomes={[income]}
        onEditIncome={onEditIncome}
      />
    )

    await user.click(screen.getByText('Freelance work'))

    expect(onEditIncome).not.toHaveBeenCalled()
  })

  it('calls onDeleteIncome after delete confirmation', async () => {
    const user = userEvent.setup()
    const onDeleteIncome = createAsyncMock()
    const income = createMockIncome({ id: 99, description: 'Bonus', amount: 200 })

    render(
      <AddedMoneyCard
        {...defaultProps}
        incomes={[income]}
        totalIncomes={200}
        onDeleteIncome={onDeleteIncome}
      />
    )

    await user.click(screen.getByRole('button', { name: /delete bonus/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDeleteIncome).toHaveBeenCalledWith(99)

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })
})
