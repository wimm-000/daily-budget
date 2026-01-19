import { Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { FormatCurrencyFn, BudgetItem } from './types'

type MonthlyOverviewCardProps = {
  /** Budget data */
  budget: BudgetItem
  /** Total fixed expenses */
  totalFixedExpenses: number
  /** Total incomes added */
  totalIncomes: number
  /** Available for daily spending */
  availableForDaily: number
  /** Days in the period */
  daysInPeriod: number
  /** Daily budget amount */
  dailyBudget: number
  /** Currency formatting function */
  formatCurrency: FormatCurrencyFn
}

/**
 * Card showing monthly budget breakdown
 */
export function MonthlyOverviewCard({
  budget,
  totalFixedExpenses,
  totalIncomes,
  availableForDaily,
  daysInPeriod,
  dailyBudget,
  formatCurrency,
}: MonthlyOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Monthly Overview
        </CardTitle>
        <CardDescription>Budget breakdown for this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Base Budget</span>
            <span>{formatCurrency(budget.monthlyAmount)}</span>
          </div>
          {totalIncomes > 0 && (
            <div className="flex justify-between text-green-600">
              <span>+ Added Money</span>
              <span>+{formatCurrency(totalIncomes)}</span>
            </div>
          )}
          {totalFixedExpenses > 0 && (
            <div className="flex justify-between text-destructive">
              <span>- Fixed Expenses</span>
              <span>-{formatCurrency(totalFixedExpenses)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>Available for Daily</span>
            <span className={availableForDaily < 0 ? 'text-destructive' : ''}>
              {formatCurrency(availableForDaily)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Daily Budget ({daysInPeriod} days)</span>
            <span>{formatCurrency(dailyBudget)}/day</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
