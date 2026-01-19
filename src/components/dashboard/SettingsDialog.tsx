import { Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FormatCurrencyFn, FixedExpenseItem, IncomeItem, BudgetItem } from './types'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: BudgetItem | null | undefined
  fixedExpenses: FixedExpenseItem[] | undefined
  incomes: IncomeItem[] | undefined
  totalFixedExpenses: number
  totalIncomes: number
  formatCurrency: FormatCurrencyFn
  onEditBudget: () => void
  onAddFixedExpense: () => void
  onDeleteFixedExpense: (id: number) => void
  onDeleteIncome: (id: number) => void
}

/**
 * Settings dialog for managing budget, fixed expenses, and incomes
 */
export function SettingsDialog({
  open,
  onOpenChange,
  budget,
  fixedExpenses,
  incomes,
  totalFixedExpenses,
  totalIncomes,
  formatCurrency,
  onEditBudget,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onDeleteIncome,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Budget Settings</DialogTitle>
          <DialogDescription>Manage your monthly budget and fixed expenses.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Monthly Budget Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Label className="text-base font-medium">Monthly Budget</Label>
              <Button variant="outline" size="sm" onClick={onEditBudget}>
                Edit Budget
              </Button>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(budget?.monthlyAmount || 0)}</div>
          </div>

          {/* Fixed Expenses Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <Label className="text-base font-medium">Fixed Monthly Expenses</Label>
                <p className="text-sm text-muted-foreground">
                  Rent, subscriptions, bills - deducted before calculating daily budget
                </p>
              </div>
              <Button variant="outline" size="sm" className="self-start" onClick={onAddFixedExpense}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {fixedExpenses && fixedExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fixedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteFixedExpense(expense.id)}
                          >
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(totalFixedExpenses)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 border rounded-md">
                No fixed expenses added
              </p>
            )}
          </div>

          {/* This Month's Income Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <Label className="text-base font-medium">Added Money This Month</Label>
                <p className="text-sm text-muted-foreground">
                  Extra income added to this month's budget
                </p>
              </div>
            </div>

            {incomes && incomes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomes.map((income) => (
                      <TableRow key={income.id}>
                        <TableCell>{income.description || 'No description'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +{formatCurrency(income.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteIncome(income.id)}
                          >
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        +{formatCurrency(totalIncomes)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 border rounded-md">
                No extra money added this month
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
