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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Monthly Budget</DialogTitle>
          <DialogDescription>
            Enter your total budget for this period. We'll calculate your daily allowance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(v) => onCurrencyChange(v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                  <SelectItem value="EUR">&#8364; EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-amount">Monthly Budget</Label>
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
              <Label htmlFor="month-start-day">Budget Period Start Day</Label>
              <Select
                value={selectedMonthStartDay.toString()}
                onValueChange={(v) => onMonthStartDayChange(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                      {day === 1 ? ' (Calendar month)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When your budget period starts each month (e.g., payday).
                {selectedMonthStartDay !== 1 &&
                  ' For months with fewer days, it will use the last available day.'}
              </p>
            </div>

            {/* Override for this specific month */}
            <div className="space-y-2">
              <Label htmlFor="budget-start-override">Override for This Period (Optional)</Label>
              <Select
                value={budgetStartDayOverride?.toString() ?? 'default'}
                onValueChange={(v) =>
                  onBudgetStartDayOverrideChange(v === 'default' ? null : parseInt(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use default (Day {selectedMonthStartDay})</SelectItem>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set a different start day for this specific period only.
              </p>
            </div>

            {monthlyAmount && parseFloat(monthlyAmount) > 0 && (
              <p className="text-sm text-muted-foreground">
                Daily budget: {formatCurrency(parseFloat(monthlyAmount) / daysInPeriod)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
