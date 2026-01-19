import { TrendingUp, TrendingDown, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BudgetProgressCircle } from './BudgetProgressCircle'
import type { FormatCurrencyFn, DailyLogItem } from './types'

type TodaySummaryCardProps = {
  /** Today's log data */
  todayLog: DailyLogItem | null | undefined
  /** Calculated daily budget */
  dailyBudget: number
  /** Currency formatting function */
  formatCurrency: FormatCurrencyFn
  /** Callback when settings button is clicked */
  onSettingsClick: () => void
}

/**
 * Summary card showing today's budget status with circular progress
 */
export function TodaySummaryCard({
  todayLog,
  dailyBudget,
  formatCurrency,
  onSettingsClick,
}: TodaySummaryCardProps) {
  const totalBudget = dailyBudget + (todayLog?.carryover ?? 0)
  const spent = todayLog?.totalSpent ?? 0
  const remaining = todayLog?.remaining ?? dailyBudget
  const isOverspent = remaining < 0
  const carryover = todayLog?.carryover ?? 0

  return (
    <div className="relative mt-16">
      {/* Cover image circle */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-16 z-10">
        <img
          src="/cover.png"
          alt="Daily Budget"
          className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
        />
      </div>
      <Card className="pt-18">
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Circle Progress */}
            <BudgetProgressCircle
              totalBudget={totalBudget}
              spent={spent}
              remaining={remaining}
            />

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Available Today</p>
                  <div
                    className={`text-2xl sm:text-3xl font-bold ${
                      isOverspent ? 'text-destructive' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(remaining)}
                  </div>
                  {todayLog && carryover !== 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {carryover > 0 ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-600" /> +
                          {formatCurrency(carryover)} carried
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-destructive" />{' '}
                          {formatCurrency(carryover)} debt
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 sm:gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Budget</p>
                    <p className="font-semibold">{formatCurrency(dailyBudget)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Spent</p>
                    <p className="font-semibold">{formatCurrency(spent)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={onSettingsClick}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
