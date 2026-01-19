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
import type { Currency, FormatCurrencyFn } from './types'

type SetBudgetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  monthlyAmount: string
  onMonthlyAmountChange: (value: string) => void
  selectedCurrency: Currency
  onCurrencyChange: (value: Currency) => void
  selectedMonthStartDay: number
  onMonthStartDayChange: (value: number) => void
  budgetStartDayOverride: number | null
  onBudgetStartDayOverrideChange: (value: number | null) => void
  daysInPeriod: number
  formatCurrency: FormatCurrencyFn
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
}

/**
 * Dialog for setting/editing monthly budget
 */
export function SetBudgetDialog({
  open,
  onOpenChange,
  monthlyAmount,
  onMonthlyAmountChange,
  selectedCurrency,
  onCurrencyChange,
  selectedMonthStartDay,
  onMonthStartDayChange,
  budgetStartDayOverride,
  onBudgetStartDayOverrideChange,
  daysInPeriod,
  formatCurrency,
  isLoading,
  onSubmit,
}: SetBudgetDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('setBudget.title')}</DialogTitle>
          <DialogDescription>
            {t('setBudget.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('setBudget.currency')}</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(v) => onCurrencyChange(v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('setBudget.selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">{t('setBudget.usd')}</SelectItem>
                  <SelectItem value="EUR">{t('setBudget.eur')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-amount">{t('setBudget.monthlyBudget')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {selectedCurrency === 'EUR' ? '\u20AC' : '$'}
                </span>
                <Input
                  id="monthly-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyAmount}
                  onChange={(e) => onMonthlyAmountChange(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Month Start Day - Global Default */}
            <div className="space-y-2">
              <Label htmlFor="month-start-day">{t('setBudget.periodStartDay')}</Label>
              <Select
                value={selectedMonthStartDay.toString()}
                onValueChange={(v) => onMonthStartDayChange(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('setBudget.selectStartDay')} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {t('setBudget.day', { day })}
                      {day === 1 ? ` ${t('setBudget.calendarMonth')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('setBudget.periodStartHelp')}
                {selectedMonthStartDay !== 1 && ` ${t('setBudget.periodStartHelpShort')}`}
              </p>
            </div>

            {/* Override for this specific month */}
            <div className="space-y-2">
              <Label htmlFor="budget-start-override">{t('setBudget.overrideTitle')}</Label>
              <Select
                value={budgetStartDayOverride?.toString() ?? 'default'}
                onValueChange={(v) =>
                  onBudgetStartDayOverrideChange(v === 'default' ? null : parseInt(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('setBudget.useDefault', { day: selectedMonthStartDay })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('setBudget.useDefault', { day: selectedMonthStartDay })}</SelectItem>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {t('setBudget.day', { day })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('setBudget.overrideHelp')}
              </p>
            </div>

            {monthlyAmount && parseFloat(monthlyAmount) > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('setBudget.dailyBudget', { amount: formatCurrency(parseFloat(monthlyAmount) / daysInPeriod) })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('setBudget.saveBudget')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
