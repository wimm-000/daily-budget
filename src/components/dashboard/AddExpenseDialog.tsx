import { useTranslation } from 'react-i18next'
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
  /** Whether the dialog is in edit mode */
  mode?: 'add' | 'edit'
}

/**
 * Dialog for adding or editing an expense
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
  mode = 'add',
}: AddExpenseDialogProps) {
  const { t } = useTranslation()
  const isEditMode = mode === 'edit'
  const title = isEditMode ? t('addExpense.editTitle') : t('addExpense.addTitle')
  const description = isEditMode
    ? t('addExpense.editDescription')
    : t('addExpense.addDescription')
  const submitText = isEditMode ? t('common.saveChanges') : t('addExpense.addTitle')
  const loadingText = isEditMode ? t('common.saving') : t('common.adding')

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
              <Label htmlFor="expense-amount">{t('common.amount')}</Label>
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
              <Label htmlFor="expense-category">{t('addExpense.category')}</Label>
              <Select
                value={expenseCategory}
                onValueChange={(v) => onExpenseCategoryChange(v as ExpenseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('addExpense.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const config = CATEGORY_CONFIG[cat]
                    const Icon = config.icon
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{t(`categories.${cat}`)}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">{t('common.descriptionOptional')}</Label>
              <Input
                id="expense-description"
                value={expenseDescription}
                onChange={(e) => onExpenseDescriptionChange(e.target.value)}
                placeholder={t('addExpense.placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
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
