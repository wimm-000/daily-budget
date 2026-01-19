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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/db/schema'
import { CATEGORY_CONFIG } from './category-config'
import type { Currency } from './types'

type AddExpenseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: Currency
  expenseAmount: string
  onExpenseAmountChange: (value: string) => void
  expenseDescription: string
  onExpenseDescriptionChange: (value: string) => void
  expenseCategory: ExpenseCategory
  onExpenseCategoryChange: (value: ExpenseCategory) => void
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

/**
 * Dialog for adding a new expense
 */
export function AddExpenseDialog({
  open,
  onOpenChange,
  currency,
  expenseAmount,
  onExpenseAmountChange,
  expenseDescription,
  onExpenseDescriptionChange,
  expenseCategory,
  onExpenseCategoryChange,
  isLoading,
  onSubmit,
}: AddExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record a new expense for today.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currency === 'EUR' ? '\u20AC' : '$'}
                </span>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseAmount}
                  onChange={(e) => onExpenseAmountChange(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Category</Label>
              <Select
                value={expenseCategory}
                onValueChange={(v) => onExpenseCategoryChange(v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const config = CATEGORY_CONFIG[cat]
                    const Icon = config.icon
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">Description (optional)</Label>
              <Input
                id="expense-description"
                value={expenseDescription}
                onChange={(e) => onExpenseDescriptionChange(e.target.value)}
                placeholder="Coffee, lunch, groceries..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
