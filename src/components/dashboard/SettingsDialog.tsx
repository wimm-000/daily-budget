import { useState } from 'react'
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
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
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
  onDeleteFixedExpense: (id: number) => Promise<void>
  onEditFixedExpense: (expense: FixedExpenseItem) => void
  onDeleteIncome: (id: number) => Promise<void>
  onEditIncome: (income: IncomeItem) => void
}

type PendingDelete =
  | { type: 'fixedExpense'; item: FixedExpenseItem }
  | { type: 'income'; item: IncomeItem }
  | null

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
  onEditFixedExpense,
  onDeleteIncome,
  onEditIncome,
}: SettingsDialogProps) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteFixedExpense = (expense: FixedExpenseItem) => {
    setPendingDelete({ type: 'fixedExpense', item: expense })
  }

  const handleDeleteIncome = (income: IncomeItem) => {
    setPendingDelete({ type: 'income', item: income })
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return

    setIsDeleting(true)
    try {
      if (pendingDelete.type === 'fixedExpense') {
        await onDeleteFixedExpense(pendingDelete.item.id)
      } else {
        await onDeleteIncome(pendingDelete.item.id)
      }
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const getDeleteDialogProps = () => {
    if (!pendingDelete) {
      return { itemType: '', itemName: '' }
    }

    if (pendingDelete.type === 'fixedExpense') {
      return {
        itemType: 'fixed expense',
        itemName: `${pendingDelete.item.name} - ${formatCurrency(pendingDelete.item.amount)}`,
      }
    }

    return {
      itemType: 'income',
      itemName: `${pendingDelete.item.description || 'No description'} - ${formatCurrency(pendingDelete.item.amount)}`,
    }
  }

  const deleteDialogProps = getDeleteDialogProps()

  return (
    <>
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
                          <TableCell
                            className="cursor-pointer hover:underline"
                            onClick={() => onEditFixedExpense(expense)}
                          >
                            {expense.name}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFixedExpense(expense)}
                              aria-label={`Delete ${expense.name}`}
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
                          <TableCell
                            className="cursor-pointer hover:underline"
                            onClick={() => onEditIncome(income)}
                          >
                            {income.description || 'No description'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            +{formatCurrency(income.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIncome(income)}
                              aria-label={`Delete ${income.description || 'income'}`}
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

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        itemType={deleteDialogProps.itemType}
        itemName={deleteDialogProps.itemName}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  )
}
