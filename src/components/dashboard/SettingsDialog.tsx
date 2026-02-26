import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import type { FormatCurrencyFn, FixedExpenseItem, BudgetItem } from './types'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  budget: BudgetItem | null | undefined
  fixedExpenses: FixedExpenseItem[] | undefined
  totalFixedExpenses: number
  formatCurrency: FormatCurrencyFn
  onEditBudget: () => void
  onAddFixedExpense: () => void
  onDeleteFixedExpense: (id: number) => Promise<void>
  onEditFixedExpense: (expense: FixedExpenseItem) => void
}

type PendingDelete = FixedExpenseItem | null

/**
 * Settings dialog for managing budget and fixed expenses
 */
export function SettingsDialog({
  open,
  onOpenChange,
  budget,
  fixedExpenses,
  totalFixedExpenses,
  formatCurrency,
  onEditBudget,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onEditFixedExpense,
}: SettingsDialogProps) {
  const { t } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteFixedExpense = (expense: FixedExpenseItem) => {
    setPendingDelete(expense)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return

    setIsDeleting(true)
    try {
      await onDeleteFixedExpense(pendingDelete.id)
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
            <DialogDescription>{t('settings.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Monthly Budget Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-base font-medium">{t('settings.monthlyBudget')}</Label>
                <Button variant="outline" size="sm" onClick={onEditBudget}>
                  {t('settings.editBudget')}
                </Button>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(budget?.monthlyAmount || 0)}</div>
            </div>

            {/* Fixed Expenses Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <Label className="text-base font-medium">{t('settings.fixedExpenses')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.fixedExpensesDescription')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="self-start" onClick={onAddFixedExpense}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('common.add')}
                </Button>
              </div>

              {fixedExpenses && fixedExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead className="text-right">{t('common.amount')}</TableHead>
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
                        <TableCell className="font-medium">{t('common.total')}</TableCell>
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
                  {t('settings.noFixedExpenses')}
                </p>
              )}
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        itemType={t('confirmDelete.fixedExpense')}
        itemName={pendingDelete ? `${pendingDelete.name} - ${formatCurrency(pendingDelete.amount)}` : ''}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  )
}
