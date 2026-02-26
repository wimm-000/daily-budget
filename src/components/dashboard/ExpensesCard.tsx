import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  /** Today's expenses (legacy fallback for current month) */
  todayExpenses: ExpenseItem[] | undefined
  /** All month expenses */
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
 * Card showing month expenses with optional day filter.
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
  const currentMonthExpenses = monthExpenses && monthExpenses.length > 0 ? monthExpenses : todayExpenses

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('expenses.monthExpenses')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MonthExpensesTable
          expenses={isCurrentMonth ? currentMonthExpenses : monthExpenses}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onDelete={onDeleteExpense}
          onEdit={onEditExpense}
          allowDelete={isCurrentMonth}
        />
      </CardContent>
    </Card>
  )
}

type MonthExpensesTableProps = {
  expenses: ExpenseItem[] | undefined
  formatCurrency: FormatCurrencyFn
  formatDate: FormatDateFn
  onDelete: (id: number) => Promise<void>
  onEdit: (expense: ExpenseItem) => void
  allowDelete: boolean
}

function MonthExpensesTable({
  expenses,
  formatCurrency,
  formatDate,
  onDelete,
  onEdit,
  allowDelete,
}: MonthExpensesTableProps) {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<ExpenseItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const dates = useMemo(() => {
    const uniqueDates = [...new Set((expenses ?? []).map((expense) => expense.date))]
    return uniqueDates.sort((a, b) => b.localeCompare(a))
  }, [expenses])

  useEffect(() => {
    if (selectedDate !== 'all' && !dates.includes(selectedDate)) {
      setSelectedDate('all')
    }
  }, [dates, selectedDate])

  const filteredExpenses =
    selectedDate === 'all'
      ? (expenses ?? [])
      : (expenses ?? []).filter((expense) => expense.date === selectedDate)

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

  const getCategoryLabel = (expense: ExpenseItem) => {
    return expense.description || t(`categories.${expense.category || 'other'}`)
  }

  const getExpenseDisplayName = (expense: ExpenseItem) => {
    const name = getCategoryLabel(expense)
    return `${name} - ${formatCurrency(expense.amount)}`
  }

  if (!expenses || expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">{t('expenses.noExpensesThisMonth')}</p>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">{t('expenses.filterByDay')}</p>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('expenses.allDays')}</SelectItem>
            {dates.map((date) => (
              <SelectItem key={date} value={date}>
                {formatDate(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredExpenses.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">{t('expenses.noExpensesForDay')}</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                {allowDelete && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
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
                    {allowDelete && (
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
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
