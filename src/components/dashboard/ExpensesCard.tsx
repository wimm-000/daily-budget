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
  /** Callback when deleting an expense */
  onDeleteExpense: (id: number) => void
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
}: ExpensesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {isCurrentMonth ? "Today's Expenses" : 'Month Expenses'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCurrentMonth ? (
          <TodayExpensesTable
            expenses={todayExpenses}
            formatCurrency={formatCurrency}
            onDelete={onDeleteExpense}
          />
        ) : (
          <MonthExpensesTable
            expenses={monthExpenses}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}
      </CardContent>
    </Card>
  )
}

type TodayExpensesTableProps = {
  expenses: ExpenseItem[] | undefined
  formatCurrency: FormatCurrencyFn
  onDelete: (id: number) => void
}

function TodayExpensesTable({ expenses, formatCurrency, onDelete }: TodayExpensesTableProps) {
  if (!expenses || expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">No expenses recorded today</p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                <TableCell>{expense.description || config.label}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(expense.amount)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)}>
                    <Minus className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

type MonthExpensesTableProps = {
  expenses: ExpenseItem[] | undefined
  formatCurrency: FormatCurrencyFn
  formatDate: FormatDateFn
}

function MonthExpensesTable({ expenses, formatCurrency, formatDate }: MonthExpensesTableProps) {
  if (!expenses || expenses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">No expenses recorded this month</p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                <TableCell>{expense.description || config.label}</TableCell>
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
