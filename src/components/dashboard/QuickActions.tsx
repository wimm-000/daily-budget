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
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddExpense}>
        <Plus className="h-4 w-4 mr-2" />
        Add Expense
      </Button>
      <Button variant="outline" onClick={onAddIncome}>
        <Banknote className="h-4 w-4 mr-2" />
        Add Money
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
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
      <Copy className="h-4 w-4 flex-shrink-0" />
      <span>
        Your monthly budget was automatically copied from last month.
        <Button
          variant="link"
          className="h-auto p-0 ml-1 text-blue-700 dark:text-blue-300 underline"
          onClick={onEditBudget}
        >
          Edit budget
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
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{isCurrentMonth ? 'Welcome to Daily Budget' : 'No Budget Data'}</CardTitle>
        <CardDescription>
          {isCurrentMonth
            ? 'Set your monthly budget to get started'
            : `No budget was set for ${formattedMonthYear}`}
        </CardDescription>
      </CardHeader>
      {isCurrentMonth && (
        <CardContent className="flex justify-center">
          <Button onClick={onSetBudget}>
            <Wallet className="h-4 w-4 mr-2" />
            Set Monthly Budget
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
