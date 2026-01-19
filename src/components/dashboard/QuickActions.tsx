import { useTranslation } from 'react-i18next'
import { Plus, Banknote, Copy, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type QuickActionsProps = {
  onAddExpense: () => void
  onAddIncome: () => void
}

/**
 * Quick action buttons for adding expense/income
 */
export function QuickActions({ onAddExpense, onAddIncome }: QuickActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddExpense}>
        <Plus className="h-4 w-4 mr-2" />
        {t('quickActions.addExpense')}
      </Button>
      <Button variant="outline" onClick={onAddIncome}>
        <Banknote className="h-4 w-4 mr-2" />
        {t('quickActions.addMoney')}
      </Button>
    </div>
  )
}

type BudgetCopiedNoticeProps = {
  onEditBudget: () => void
}

/**
 * Notice shown when budget was copied from previous month
 */
export function BudgetCopiedNotice({ onEditBudget }: BudgetCopiedNoticeProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
      <Copy className="h-4 w-4 flex-shrink-0" />
      <span>
        {t('quickActions.budgetCopied')}
        <Button
          variant="link"
          className="h-auto p-0 ml-1 text-blue-700 dark:text-blue-300 underline"
          onClick={onEditBudget}
        >
          {t('quickActions.editBudget')}
        </Button>
      </span>
    </div>
  )
}

type NoBudgetCardProps = {
  isCurrentMonth: boolean
  formattedMonthYear: string
  onSetBudget: () => void
}

/**
 * Card shown when no budget is set
 */
export function NoBudgetCard({ isCurrentMonth, formattedMonthYear, onSetBudget }: NoBudgetCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {isCurrentMonth ? t('noBudget.welcomeTitle') : t('noBudget.noBudgetTitle')}
        </CardTitle>
        <CardDescription>
          {isCurrentMonth
            ? t('noBudget.welcomeDescription')
            : t('noBudget.noBudgetDescription', { month: formattedMonthYear })}
        </CardDescription>
      </CardHeader>
      {isCurrentMonth && (
        <CardContent className="flex justify-center">
          <Button onClick={onSetBudget}>
            <Wallet className="h-4 w-4 mr-2" />
            {t('noBudget.setMonthlyBudget')}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
