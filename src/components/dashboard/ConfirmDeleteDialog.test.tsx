import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'

describe('ConfirmDeleteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    itemType: 'expense',
    itemName: 'Coffee - €5.00',
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders dialog when open is true', () => {
      render(<ConfirmDeleteDialog {...defaultProps} />)
      
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(<ConfirmDeleteDialog {...defaultProps} open={false} />)
      
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('displays correct title with item type', () => {
      render(<ConfirmDeleteDialog {...defaultProps} itemType="expense" />)
      
      expect(screen.getByText('Delete expense?')).toBeInTheDocument()
    })

    it('displays item name in description', () => {
      render(<ConfirmDeleteDialog {...defaultProps} itemName="Netflix - €15.99" />)
      
      expect(screen.getByText(/Netflix - €15.99/)).toBeInTheDocument()
    })

    it('displays warning about irreversible action', () => {
      render(<ConfirmDeleteDialog {...defaultProps} />)
      
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      render(<ConfirmDeleteDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('renders Delete button', () => {
      render(<ConfirmDeleteDialog {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })
  })

  describe('different item types', () => {
    it('displays "Delete fixed expense?" for fixed expense type', () => {
      render(<ConfirmDeleteDialog {...defaultProps} itemType="fixed expense" />)
      
      expect(screen.getByText('Delete fixed expense?')).toBeInTheDocument()
    })

    it('displays "Delete income?" for income type', () => {
      render(<ConfirmDeleteDialog {...defaultProps} itemType="income" />)
      
      expect(screen.getByText('Delete income?')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onConfirm when Delete button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />)
      
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('does not call onConfirm when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} />)
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('calls onOpenChange when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()
      render(<ConfirmDeleteDialog {...defaultProps} onOpenChange={onOpenChange} />)
      
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('loading state', () => {
    it('shows spinner instead of Delete text when loading', () => {
      render(<ConfirmDeleteDialog {...defaultProps} isLoading={true} />)
      
      // Delete text should not be visible
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
      
      // Spinner should be visible (SVG with animate-spin class)
      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(btn => btn.classList.contains('bg-destructive'))
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton?.querySelector('svg')).toHaveClass('animate-spin')
    })

    it('disables Cancel button when loading', () => {
      render(<ConfirmDeleteDialog {...defaultProps} isLoading={true} />)
      
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })

    it('disables Delete button when loading', () => {
      render(<ConfirmDeleteDialog {...defaultProps} isLoading={true} />)
      
      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(btn => btn.classList.contains('bg-destructive'))
      expect(deleteButton).toBeDisabled()
    })

    it('does not call onConfirm when Delete button is clicked while loading', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConfirmDeleteDialog {...defaultProps} onConfirm={onConfirm} isLoading={true} />)
      
      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(btn => btn.classList.contains('bg-destructive'))
      await user.click(deleteButton!)
      
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('prevents closing dialog when loading', async () => {
      const onOpenChange = vi.fn()
      render(<ConfirmDeleteDialog {...defaultProps} onOpenChange={onOpenChange} isLoading={true} />)
      
      // Try clicking Cancel (which would normally close the dialog)
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      // Button is disabled so click won't trigger onOpenChange through the normal flow
      expect(cancelButton).toBeDisabled()
    })

    it('does not show spinner when not loading', () => {
      render(<ConfirmDeleteDialog {...defaultProps} isLoading={false} />)
      
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      expect(deleteButton.querySelector('svg.animate-spin')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('Delete button has destructive styling', () => {
      render(<ConfirmDeleteDialog {...defaultProps} />)
      
      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      expect(deleteButton).toHaveClass('bg-destructive')
    })
  })
})
