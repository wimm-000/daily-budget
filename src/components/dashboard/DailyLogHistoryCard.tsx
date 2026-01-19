import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
}

/**
 * Card showing daily log history
 */
export function DailyLogHistoryCard({
  isCurrentMonth,
  recentLogs,
  formatCurrency,
  formatDate,
}: DailyLogHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isCurrentMonth ? 'Recent Days' : 'Daily History'}</CardTitle>
        <CardDescription>Your spending history and carryover</CardDescription>
      </CardHeader>
      <CardContent>
        {recentLogs && recentLogs.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Budget</TableHead>
                  <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">
                    Carryover
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">Spent</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Remaining</TableHead>
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
          <p className="text-muted-foreground text-center py-4">No history yet</p>
        )}
      </CardContent>
    </Card>
  )
}
