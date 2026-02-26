import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FormatCurrencyFn, FormatDateFn, DailyLogItem } from './types'

type DailyLogHistoryCardProps = {
  /** Whether viewing current month */
  isCurrentMonth: boolean
  /** Recent daily logs */
  recentLogs: DailyLogItem[] | undefined
  /** Currency formatting function */
  formatCurrency: FormatCurrencyFn
  /** Date formatting function */
  formatDate: FormatDateFn
  /** Collapse state */
  isCollapsed?: boolean
  /** Toggle collapse */
  onToggleCollapse?: () => void
}

/**
 * Card showing daily log history
 */
export function DailyLogHistoryCard({
  isCurrentMonth,
  recentLogs,
  formatCurrency,
  formatDate,
  isCollapsed = false,
  onToggleCollapse,
}: DailyLogHistoryCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            {isCurrentMonth ? t('dailyLog.recentDays') : t('dailyLog.dailyHistory')}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={t('common.close')}
            className="h-8 w-8"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')} />
          </Button>
        </div>
        <CardDescription>{t('dailyLog.historyDescription')}</CardDescription>
      </CardHeader>
      {!isCollapsed && <CardContent>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('common.date')}</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{t('dashboard.budget')}</TableHead>
                  <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">
                    {t('dailyLog.carryover')}
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">{t('dashboard.spent')}</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{t('dailyLog.remaining')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDate(log.date)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(log.dailyBudget)}
                    </TableCell>
                    <TableCell
                      className={`text-right whitespace-nowrap hidden sm:table-cell ${
                        log.carryover > 0
                          ? 'text-green-600'
                          : log.carryover < 0
                            ? 'text-destructive'
                            : ''
                      }`}
                    >
                      {log.carryover > 0 ? '+' : ''}
                      {formatCurrency(log.carryover)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(log.totalSpent)}
                    </TableCell>
                    <TableCell
                      className={`text-right whitespace-nowrap font-medium ${
                        log.remaining < 0 ? 'text-destructive' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(log.remaining)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">{t('dailyLog.noHistory')}</p>
        )}
      </CardContent>}
    </Card>
  )
}
