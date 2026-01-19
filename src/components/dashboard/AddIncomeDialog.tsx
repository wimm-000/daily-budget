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

type AddIncomeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: Currency
  incomeAmount: string
  onIncomeAmountChange: (value: string) => void
  incomeDescription: string
  onIncomeDescriptionChange: (value: string) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  /** Whether the dialog is in edit mode */
  mode?: 'add' | 'edit'
}

/**
 * Dialog for adding or editing income/extra money
 */
export function AddIncomeDialog({
  open,
  onOpenChange,
  currency,
  incomeAmount,
  onIncomeAmountChange,
  incomeDescription,
  onIncomeDescriptionChange,
  isLoading,
  onSubmit,
  mode = 'add',
}: AddIncomeDialogProps) {
  const isEditMode = mode === 'edit'
  const title = isEditMode ? 'Edit Money' : 'Add Money'
  const description = isEditMode
    ? 'Update the income details.'
    : "Add extra income or money to this month's budget."
  const submitText = isEditMode ? 'Save Changes' : 'Add Money'
  const loadingText = isEditMode ? 'Saving...' : 'Adding...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currency === 'EUR' ? '\u20AC' : '$'}
                </span>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={incomeAmount}
                  onChange={(e) => onIncomeAmountChange(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-description">Description (optional)</Label>
              <Input
                id="income-description"
                value={incomeDescription}
                onChange={(e) => onIncomeDescriptionChange(e.target.value)}
                placeholder="Bonus, gift, refund..."
              />
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
