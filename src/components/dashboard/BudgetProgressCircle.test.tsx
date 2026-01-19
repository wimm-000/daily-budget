import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetProgressCircle, MonthProgressCircle } from './BudgetProgressCircle'

describe('BudgetProgressCircle', () => {
  describe('rendering', () => {
    it('renders an SVG element', () => {
      const { container } = render(
        <BudgetProgressCircle totalBudget={100} spent={50} remaining={50} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders with custom size', () => {
      const { container } = render(
        <BudgetProgressCircle totalBudget={100} spent={50} remaining={50} size={200} />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '200')
      expect(svg).toHaveAttribute('height', '200')
    })

    it('renders with default size of 100', () => {
      const { container } = render(
        <BudgetProgressCircle totalBudget={100} spent={50} remaining={50} />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '100')
      expect(svg).toHaveAttribute('height', '100')
    })
  })

  describe('percentage display - under budget', () => {
    it('shows 100% left when nothing spent', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={0} remaining={100} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('left')).toBeInTheDocument()
    })

    it('shows 50% left when half spent', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={50} remaining={50} />)
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('left')).toBeInTheDocument()
    })

    it('shows 25% left when 75% spent', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={75} remaining={25} />)
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText('left')).toBeInTheDocument()
    })

    it('shows 0% left when fully spent', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={100} remaining={0} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('left')).toBeInTheDocument()
    })
  })

  describe('percentage display - overspent', () => {
    it('shows percentage over with negative sign when overspent', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={120} remaining={-20} />)
      expect(screen.getByText('-10%')).toBeInTheDocument()
      expect(screen.getByText('over')).toBeInTheDocument()
    })

    it('shows larger overspend percentage correctly', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={150} remaining={-50} />)
      expect(screen.getByText('-25%')).toBeInTheDocument()
      expect(screen.getByText('over')).toBeInTheDocument()
    })

    it('caps overspent percentage display at 50%', () => {
      // With 200% overspent (spent 300 of 100), it should cap the display
      render(<BudgetProgressCircle totalBudget={100} spent={300} remaining={-200} />)
      expect(screen.getByText('-50%')).toBeInTheDocument()
      expect(screen.getByText('over')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles zero budget', () => {
      render(<BudgetProgressCircle totalBudget={0} spent={0} remaining={0} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('handles small remaining amounts', () => {
      render(<BudgetProgressCircle totalBudget={100} spent={99} remaining={1} />)
      expect(screen.getByText('1%')).toBeInTheDocument()
      expect(screen.getByText('left')).toBeInTheDocument()
    })

    it('handles decimal values', () => {
      render(<BudgetProgressCircle totalBudget={33.33} spent={10.50} remaining={22.83} />)
      // 22.83 / 33.33 = ~68.5% left, rounds to 68%
      expect(screen.getByText('68%')).toBeInTheDocument()
    })
  })

  describe('styling classes', () => {
    it('applies green color when under budget', () => {
      const { container } = render(
        <BudgetProgressCircle totalBudget={100} spent={50} remaining={50} />
      )
      const percentText = screen.getByText('50%')
      expect(percentText).toHaveClass('text-green-600')
      
      // Check SVG circle has green class
      const circles = container.querySelectorAll('circle')
      const spentCircle = circles[1] // Second circle is the spent portion
      expect(spentCircle).toHaveClass('text-green-500')
    })

    it('applies yellow/red colors when overspent', () => {
      const { container } = render(
        <BudgetProgressCircle totalBudget={100} spent={120} remaining={-20} />
      )
      const percentText = screen.getByText('-10%')
      expect(percentText).toHaveClass('text-destructive')
      
      // Check SVG has yellow and red circles
      const circles = container.querySelectorAll('circle')
      expect(circles.length).toBe(3) // background, spent (yellow), overspent (red)
      expect(circles[1]).toHaveClass('text-yellow-500')
      expect(circles[2]).toHaveClass('text-destructive')
    })
  })
})

describe('MonthProgressCircle', () => {
  describe('rendering', () => {
    it('renders an SVG element', () => {
      const { container } = render(
        <MonthProgressCircle monthlyBudget={1000} spent={500} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders with custom size', () => {
      const { container } = render(
        <MonthProgressCircle monthlyBudget={1000} spent={500} size={150} />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('width', '150')
      expect(svg).toHaveAttribute('height', '150')
    })
  })

  describe('percentage display - under budget', () => {
    it('shows 0% used when nothing spent', () => {
      render(<MonthProgressCircle monthlyBudget={1000} spent={0} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('used')).toBeInTheDocument()
    })

    it('shows 50% used when half spent', () => {
      render(<MonthProgressCircle monthlyBudget={1000} spent={500} />)
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('used')).toBeInTheDocument()
    })

    it('shows 100% used when fully spent', () => {
      render(<MonthProgressCircle monthlyBudget={1000} spent={1000} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('used')).toBeInTheDocument()
    })
  })

  describe('percentage display - overspent', () => {
    it('still shows 100% when overspent (capped)', () => {
      render(<MonthProgressCircle monthlyBudget={1000} spent={1200} />)
      // The display caps at 100% for the used text
      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('used')).toBeInTheDocument()
    })
  })

  describe('styling classes', () => {
    it('applies green color when under budget', () => {
      const { container } = render(
        <MonthProgressCircle monthlyBudget={1000} spent={500} />
      )
      const percentText = screen.getByText('50%')
      expect(percentText).toHaveClass('text-green-600')
      
      const circles = container.querySelectorAll('circle')
      expect(circles[1]).toHaveClass('text-green-500')
    })

    it('applies destructive color when overspent', () => {
      const { container } = render(
        <MonthProgressCircle monthlyBudget={1000} spent={1200} />
      )
      const percentText = screen.getByText('100%')
      expect(percentText).toHaveClass('text-destructive')
      
      // Has 3 circles when overspent
      const circles = container.querySelectorAll('circle')
      expect(circles.length).toBe(3)
    })
  })

  describe('edge cases', () => {
    it('handles zero budget', () => {
      render(<MonthProgressCircle monthlyBudget={0} spent={0} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('handles decimal values', () => {
      render(<MonthProgressCircle monthlyBudget={1000} spent={333.33} />)
      expect(screen.getByText('33%')).toBeInTheDocument()
    })
  })
})
