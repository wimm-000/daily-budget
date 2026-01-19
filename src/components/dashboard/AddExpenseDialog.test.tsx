import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddExpenseDialog } from './AddExpenseDialog'

describe('AddExpenseDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currency: 'EUR' as const,
    expenseAmount: '',
    onExpenseAmountChange: vi.fn(),
    expenseDescription: '',
    onExpenseDescriptionChange: vi.fn(),
    expenseCategory: 'other' as const,
    onExpenseCategoryChange: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
  }

  describe('add mode (default)', () => {
    it('renders with "Add Expense" title', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Add Expense' })).toBeInTheDocument()
    })

    it('renders with add mode description', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByText('Record a new expense for today.')).toBeInTheDocument()
    })

    it('shows "Add Expense" button text', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument()
    })

    it('shows "Adding..." when loading in add mode', () => {
      render(<AddExpenseDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('renders with "Edit Expense" title', () => {
      render(<AddExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByRole('heading', { name: 'Edit Expense' })).toBeInTheDocument()
    })

    it('renders with edit mode description', () => {
      render(<AddExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByText('Update the expense details.')).toBeInTheDocument()
    })

    it('shows "Save Changes" button text', () => {
      render(<AddExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('shows "Saving..." when loading in edit mode', () => {
      render(<AddExpenseDialog {...defaultProps} mode="edit" isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    })
  })

  describe('form elements', () => {
    it('renders amount input', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    })

    it('renders category select', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      // Radix Select uses a combobox role instead of a native select
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders description input', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
    })

    it('renders currency symbol for EUR', () => {
      render(<AddExpenseDialog {...defaultProps} currency="EUR" />)
      expect(screen.getByText('€')).toBeInTheDocument()
    })

    it('renders currency symbol for USD', () => {
      render(<AddExpenseDialog {...defaultProps} currency="USD" />)
      expect(screen.getByText('$')).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<AddExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e) => e.preventDefault())
      render(<AddExpenseDialog {...defaultProps} expenseAmount="10" onSubmit={onSubmit} />)
      
      await user.click(screen.getByRole('button', { name: 'Add Expense' }))
      
      expect(onSubmit).toHaveBeenCalled()
    })

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<AddExpenseDialog {...defaultProps} onOpenChange={onOpenChange} />)
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables submit button when loading', () => {
      render(<AddExpenseDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
    })
  })
})
