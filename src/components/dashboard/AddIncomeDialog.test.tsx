import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddIncomeDialog } from './AddIncomeDialog'

describe('AddIncomeDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    currency: 'EUR' as const,
    incomeAmount: '',
    onIncomeAmountChange: vi.fn(),
    incomeDescription: '',
    onIncomeDescriptionChange: vi.fn(),
    isLoading: false,
    onSubmit: vi.fn(),
  }

  describe('add mode (default)', () => {
    it('renders with "Add Money" title', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Add Money' })).toBeInTheDocument()
    })

    it('renders with add mode description', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByText("Add extra income or money to this month's budget.")).toBeInTheDocument()
    })

    it('shows "Add Money" button text', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Add Money' })).toBeInTheDocument()
    })

    it('shows "Adding..." when loading in add mode', () => {
      render(<AddIncomeDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('renders with "Edit Money" title', () => {
      render(<AddIncomeDialog {...defaultProps} mode="edit" />)
      expect(screen.getByText('Edit Money')).toBeInTheDocument()
    })

    it('renders with edit mode description', () => {
      render(<AddIncomeDialog {...defaultProps} mode="edit" />)
      expect(screen.getByText('Update the income details.')).toBeInTheDocument()
    })

    it('shows "Save Changes" button text', () => {
      render(<AddIncomeDialog {...defaultProps} mode="edit" />)
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    })

    it('shows "Saving..." when loading in edit mode', () => {
      render(<AddIncomeDialog {...defaultProps} mode="edit" isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
    })
  })

  describe('form elements', () => {
    it('renders amount input', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    })

    it('renders description input', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
    })

    it('renders currency symbol for EUR', () => {
      render(<AddIncomeDialog {...defaultProps} currency="EUR" />)
      expect(screen.getByText('€')).toBeInTheDocument()
    })

    it('renders currency symbol for USD', () => {
      render(<AddIncomeDialog {...defaultProps} currency="USD" />)
      expect(screen.getByText('$')).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<AddIncomeDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onSubmit when form is submitted', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((e) => e.preventDefault())
      render(<AddIncomeDialog {...defaultProps} incomeAmount="500" onSubmit={onSubmit} />)
      
      await user.click(screen.getByRole('button', { name: 'Add Money' }))
      
      expect(onSubmit).toHaveBeenCalled()
    })

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<AddIncomeDialog {...defaultProps} onOpenChange={onOpenChange} />)
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('disables submit button when loading', () => {
      render(<AddIncomeDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
    })
  })
})
