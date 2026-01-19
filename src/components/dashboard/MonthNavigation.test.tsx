import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthNavigation, PastMonthNotice } from './MonthNavigation'

describe('MonthNavigation', () => {
  const defaultProps = {
    formattedMonthYear: 'January 2026',
    isCurrentMonth: true,
    canGoNext: false,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onGoToCurrent: vi.fn(),
  }

  describe('rendering', () => {
    it('renders the month/year text', () => {
      render(<MonthNavigation {...defaultProps} />)
      expect(screen.getByText('January 2026')).toBeInTheDocument()
    })

    it('renders previous and next navigation buttons', () => {
      render(<MonthNavigation {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2) // Previous and Next buttons only (no "Today" button)
    })

    it('renders "Today" button when not viewing current month', () => {
      render(
        <MonthNavigation
          {...defaultProps}
          isCurrentMonth={false}
        />
      )
      expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
    })

    it('does not render "Today" button when viewing current month', () => {
      render(<MonthNavigation {...defaultProps} isCurrentMonth={true} />)
      expect(screen.queryByRole('button', { name: /today/i })).not.toBeInTheDocument()
    })
  })

  describe('navigation button states', () => {
    it('disables next button when canGoNext is false', () => {
      render(<MonthNavigation {...defaultProps} canGoNext={false} />)
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[1] // Second button is the next button
      expect(nextButton).toBeDisabled()
    })

    it('enables next button when canGoNext is true', () => {
      render(<MonthNavigation {...defaultProps} canGoNext={true} />)
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons[1]
      expect(nextButton).not.toBeDisabled()
    })

    it('previous button is always enabled', () => {
      render(<MonthNavigation {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons[0]
      expect(prevButton).not.toBeDisabled()
    })
  })

  describe('navigation callbacks', () => {
    it('calls onPrevious when previous button is clicked', async () => {
      const user = userEvent.setup()
      const onPrevious = vi.fn()
      render(<MonthNavigation {...defaultProps} onPrevious={onPrevious} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(onPrevious).toHaveBeenCalledTimes(1)
    })

    it('calls onNext when next button is clicked', async () => {
      const user = userEvent.setup()
      const onNext = vi.fn()
      render(<MonthNavigation {...defaultProps} canGoNext={true} onNext={onNext} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[1])

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('does not call onNext when next button is disabled', async () => {
      const user = userEvent.setup()
      const onNext = vi.fn()
      render(<MonthNavigation {...defaultProps} canGoNext={false} onNext={onNext} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[1])

      expect(onNext).not.toHaveBeenCalled()
    })

    it('calls onGoToCurrent when "Today" button is clicked', async () => {
      const user = userEvent.setup()
      const onGoToCurrent = vi.fn()
      render(
        <MonthNavigation
          {...defaultProps}
          isCurrentMonth={false}
          onGoToCurrent={onGoToCurrent}
        />
      )

      await user.click(screen.getByRole('button', { name: /today/i }))

      expect(onGoToCurrent).toHaveBeenCalledTimes(1)
    })
  })

  describe('different month formats', () => {
    it('renders various month/year formats correctly', () => {
      const { rerender } = render(
        <MonthNavigation {...defaultProps} formattedMonthYear="December 2025" />
      )
      expect(screen.getByText('December 2025')).toBeInTheDocument()

      rerender(<MonthNavigation {...defaultProps} formattedMonthYear="Feb 2026" />)
      expect(screen.getByText('Feb 2026')).toBeInTheDocument()

      rerender(<MonthNavigation {...defaultProps} formattedMonthYear="2026-03" />)
      expect(screen.getByText('2026-03')).toBeInTheDocument()
    })
  })
})

describe('PastMonthNotice', () => {
  const defaultProps = {
    formattedMonthYear: 'December 2025',
    onGoToCurrent: vi.fn(),
  }

  describe('rendering', () => {
    it('renders the notice with month/year', () => {
      render(<PastMonthNotice {...defaultProps} />)
      expect(screen.getByText(/viewing historical data for december 2025/i)).toBeInTheDocument()
    })

    it('renders "Go to current month" link', () => {
      render(<PastMonthNotice {...defaultProps} />)
      expect(screen.getByRole('button', { name: /go to current month/i })).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('calls onGoToCurrent when link is clicked', async () => {
      const user = userEvent.setup()
      const onGoToCurrent = vi.fn()
      render(<PastMonthNotice {...defaultProps} onGoToCurrent={onGoToCurrent} />)

      await user.click(screen.getByRole('button', { name: /go to current month/i }))

      expect(onGoToCurrent).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('has warning/notice styling classes', () => {
      const { container } = render(<PastMonthNotice {...defaultProps} />)
      const noticeDiv = container.firstChild as HTMLElement
      expect(noticeDiv).toHaveClass('bg-yellow-50')
      expect(noticeDiv).toHaveClass('border-yellow-200')
    })
  })
})
