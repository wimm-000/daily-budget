import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCategoryConfig } from './category-config'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { FormatCurrencyFn, FormatDateFn, ExpenseItem } from './types'

type ExpensesCardProps = {
  /** Whether viewing current month */
  isCurrentMonth: boolean
  /** Today's expenses (current month) */
  todayExpenses: ExpenseItem[] | undefined
  /** All month expenses (past month) */
  monthExpenses: ExpenseItem[] | undefined
  /** Currency formatting function */
  formatCurrency: FormatCurrencyFn
  /** Date formatting function */
  formatDate: FormatDateFn
  /** Callback when deleting an expense (async) */
  onDeleteExpense: (id: number) => Promise<void>
  /** Callback when editing an expense */
  onEditExpense: (expense: ExpenseItem) => void
}

/**
 * Card showing expenses - today's for current month, all for past months
 */
export function ExpensesCard({
  isCurrentMonth,
  todayExpenses,
  monthExpenses,
  formatCurrency,
  formatDate,
  onDeleteExpense,
  onEditExpense,
}: ExpensesCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isCurrentMonth ? t('expenses.todaysExpenses') : t('expenses.monthExpenses')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCurrentMonth ? (
          <TodayExpensesTable
            expenses={todayExpenses}
            formatCurrency={formatCurrency}
            onDelete={onDeleteExpense}
            onEdit={onEditExpense}
          />
        ) : (
          <MonthExpensesTable
            expenses={monthExpenses}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onEdit={onEditExpense}
          />
        )}
      </CardContent>
    </Card>
  )
}

type TodayExpensesTableProps = {
  expenses: ExpenseItem[] | undefined
  formatCurrency: FormatCurrencyFn
  onDelete: (id: number) => Promise<void>
  onEdit: (expense: ExpenseItem) => void
}

function TodayExpensesTable({ expenses, formatCurrency, onDelete, onEdit }: TodayExpensesTableProps) {
  const { t } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<ExpenseItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!expenses || expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">{t('expenses.noExpensesToday')}</p>
    )
  }

  const handleDeleteClick = (expense: ExpenseItem) => {
    setPendingDelete(expense)
  }

  const handleConfirmDelete = async () => {
    if (pendingDelete) {
      setIsDeleting(true)
      try {
        await onDelete(pendingDelete.id)
        setPendingDelete(null)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const getExpenseDisplayName = (expense: ExpenseItem) => {
    const name = expense.description || t(`categories.${expense.category || 'other'}`)
    return `${name} - ${formatCurrency(expense.amount)}`
  }

  const getCategoryLabel = (expense: ExpenseItem) => {
    return expense.description || t(`categories.${expense.category || 'other'}`)
  }

  return (
    <>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>{t('common.description')}</TableHead>
              <TableHead className="text-right">{t('common.amount')}</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => {
              const config = getCategoryConfig(expense.category)
              const Icon = config.icon
              return (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </TableCell>
                  <TableCell
                    className="cursor-pointer hover:underline"
                    onClick={() => onEdit(expense)}
                  >
                    {getCategoryLabel(expense)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(expense)}
                      aria-label={`Delete ${getCategoryLabel(expense)}`}
                    >
                      <Minus className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        itemType={t('confirmDelete.expense')}
        itemName={pendingDelete ? getExpenseDisplayName(pendingDelete) : ''}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  )
}

type MonthExpensesTableProps = {
  expenses: ExpenseItem[] | undefined
  formatCurrency: FormatCurrencyFn
  formatDate: FormatDateFn
  onEdit: (expense: ExpenseItem) => void
}

function MonthExpensesTable({ expenses, formatCurrency, formatDate, onEdit }: MonthExpensesTableProps) {
  const { t } = useTranslation()

  if (!expenses || expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">{t('expenses.noExpensesThisMonth')}</p>
    )
  }

  const getCategoryLabel = (expense: ExpenseItem) => {
    return expense.description || t(`categories.${expense.category || 'other'}`)
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>{t('common.date')}</TableHead>
            <TableHead>{t('common.description')}</TableHead>
            <TableHead className="text-right">{t('common.amount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const config = getCategoryConfig(expense.category)
            const Icon = config.icon
            return (
              <TableRow key={expense.id}>
                <TableCell>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(expense.date)}
                </TableCell>
                <TableCell
                  className="cursor-pointer hover:underline"
                  onClick={() => onEdit(expense)}
                >
                  {getCategoryLabel(expense)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(expense.amount)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
