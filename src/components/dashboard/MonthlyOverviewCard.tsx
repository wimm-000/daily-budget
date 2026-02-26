import { useTranslation } from 'react-i18next'
import { ChevronDown, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  /** Collapse state */
  isCollapsed?: boolean
  /** Toggle collapse */
  onToggleCollapse?: () => void
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
  isCollapsed = false,
  onToggleCollapse,
}: MonthlyOverviewCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('monthlyOverview.title')}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={t('common.close')}
            className="h-8 w-8"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')} />
          </Button>
        </div>
        <CardDescription>{t('monthlyOverview.description')}</CardDescription>
      </CardHeader>
      {!isCollapsed && <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('monthlyOverview.baseBudget')}</span>
            <span>{formatCurrency(budget.monthlyAmount)}</span>
          </div>
          {totalIncomes > 0 && (
            <div className="flex justify-between text-green-600">
              <span>{t('monthlyOverview.addedMoney')}</span>
              <span>+{formatCurrency(totalIncomes)}</span>
            </div>
          )}
          {totalFixedExpenses > 0 && (
            <div className="flex justify-between text-destructive">
              <span>{t('monthlyOverview.fixedExpenses')}</span>
              <span>-{formatCurrency(totalFixedExpenses)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>{t('monthlyOverview.availableForDaily')}</span>
            <span className={availableForDaily < 0 ? 'text-destructive' : ''}>
              {formatCurrency(availableForDaily)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('monthlyOverview.dailyBudget', { days: daysInPeriod })}</span>
            <span>{t('monthlyOverview.perDay', { amount: formatCurrency(dailyBudget) })}</span>
          </div>
        </div>
      </CardContent>}
    </Card>
  )
}
