import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Currency } from './types'

type AddFixedExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: Currency
  fixedExpenseName: string
  onFixedExpenseNameChange: (value: string) => void
  fixedExpenseAmount: string
  onFixedExpenseAmountChange: (value: string) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  /** Whether the dialog is in edit mode */
  mode?: 'add' | 'edit'
}

/**
 * Dialog for adding or editing a fixed monthly expense
 */
export function AddFixedExpenseDialog({
  open,
  onOpenChange,
  currency,
  fixedExpenseName,
  onFixedExpenseNameChange,
  fixedExpenseAmount,
  onFixedExpenseAmountChange,
  isLoading,
  onSubmit,
  mode = 'add',
}: AddFixedExpenseDialogProps) {
  const isEditMode = mode === 'edit'
  const title = isEditMode ? 'Edit Fixed Expense' : 'Add Fixed Expense'
  const description = isEditMode
    ? 'Update the fixed expense details.'
    : 'Add a recurring monthly expense like rent, subscriptions, or bills.'
  const submitText = isEditMode ? 'Save Changes' : 'Add Fixed Expense'
  const loadingText = isEditMode ? 'Saving...' : 'Adding...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fixed-expense-name">Name</Label>
              <Input
                id="fixed-expense-name"
                value={fixedExpenseName}
                onChange={(e) => onFixedExpenseNameChange(e.target.value)}
                placeholder="Rent, Netflix, Gym..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed-expense-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currency === 'EUR' ? '\u20AC' : '$'}
                </span>
                <Input
                  id="fixed-expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fixedExpenseAmount}
                  onChange={(e) => onFixedExpenseAmountChange(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? loadingText : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
