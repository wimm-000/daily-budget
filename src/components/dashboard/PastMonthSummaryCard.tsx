import { Card, CardContent } from '@/components/ui/card'
import { MonthProgressCircle } from './BudgetProgressCircle'
import type { FormatCurrencyFn, ExpenseItem, DailyLogItem } from './types'

type PastMonthSummaryCardProps = {
  /** Available budget for daily spending */
  availableForDaily: number
  /** All expenses for the month */
  monthExpenses: ExpenseItem[] | undefined
  /** Daily logs for the month */
  recentLogs: DailyLogItem[] | undefined
  /** Days in the period */
  daysInPeriod: number
  /** Currency formatting function */
  formatCurrency: FormatCurrencyFn
}

/**
 * Summary card for viewing past months
 */
export function PastMonthSummaryCard({
  availableForDaily,
  monthExpenses,
  recentLogs,
  daysInPeriod,
  formatCurrency,
}: PastMonthSummaryCardProps) {
  const monthlyBudget = availableForDaily
  const spent = monthExpenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0
  const expenseCount = monthExpenses?.length ?? 0
  const daysTracked = recentLogs?.length ?? 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-6">
          {/* Circle Progress for month */}
          <MonthProgressCircle monthlyBudget={monthlyBudget} spent={spent} />

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <div className="text-2xl sm:text-3xl font-bold">{formatCurrency(spent)}</div>
                <p className="text-xs text-muted-foreground mt-1">{expenseCount} expense(s)</p>
              </div>

              <div className="flex gap-4 sm:gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-semibold">{formatCurrency(availableForDaily)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-semibold">
                    {daysTracked}/{daysInPeriod}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
