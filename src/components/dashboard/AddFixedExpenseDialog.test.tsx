import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddFixedExpenseDialog } from './AddFixedExpenseDialog'

describe('AddFixedExpenseDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currency: 'EUR' as const,
    fixedExpenseName: '',
    onFixedExpenseNameChange: vi.fn(),
    fixedExpenseAmount: '',
    onFixedExpenseAmountChange: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
  }

  describe('add mode (default)', () => {
    it('renders with "Add Fixed Expense" title', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Add Fixed Expense' })).toBeInTheDocument()
    })

    it('renders with add mode description', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByText('Add a recurring monthly expense like rent, subscriptions, or bills.')).toBeInTheDocument()
    })

    it('shows "Add Fixed Expense" button text', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Add Fixed Expense' })).toBeInTheDocument()
    })

    it('shows "Adding..." when loading in add mode', () => {
      render(<AddFixedExpenseDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('renders with "Edit Fixed Expense" title', () => {
      render(<AddFixedExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByText('Edit Fixed Expense')).toBeInTheDocument()
    })

    it('renders with edit mode description', () => {
      render(<AddFixedExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByText('Update the fixed expense details.')).toBeInTheDocument()
    })

    it('shows "Save Changes" button text', () => {
      render(<AddFixedExpenseDialog {...defaultProps} mode="edit" />)
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('shows "Saving..." when loading in edit mode', () => {
      render(<AddFixedExpenseDialog {...defaultProps} mode="edit" isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    })
  })

  describe('form elements', () => {
    it('renders name input', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })

    it('renders amount input', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    })

    it('renders currency symbol for EUR', () => {
      render(<AddFixedExpenseDialog {...defaultProps} currency="EUR" />)
      expect(screen.getByText('€')).toBeInTheDocument()
    })

    it('renders currency symbol for USD', () => {
      render(<AddFixedExpenseDialog {...defaultProps} currency="USD" />)
      expect(screen.getByText('$')).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<AddFixedExpenseDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e) => e.preventDefault())
      render(<AddFixedExpenseDialog {...defaultProps} fixedExpenseName="Rent" fixedExpenseAmount="1000" onSubmit={onSubmit} />)
      
      await user.click(screen.getByRole('button', { name: 'Add Fixed Expense' }))
      
      expect(onSubmit).toHaveBeenCalled()
    })

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<AddFixedExpenseDialog {...defaultProps} onOpenChange={onOpenChange} />)
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables submit button when loading', () => {
      render(<AddFixedExpenseDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
    })
  })
})
