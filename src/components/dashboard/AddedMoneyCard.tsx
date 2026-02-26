import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, PiggyBank } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { FormatCurrencyFn, IncomeItem } from './types'

type AddedMoneyCardProps = {
  incomes: IncomeItem[] | undefined
  totalIncomes: number
  isCurrentMonth: boolean
  formatCurrency: FormatCurrencyFn
  onAddIncome: () => void
  onEditIncome: (income: IncomeItem) => void
  onDeleteIncome: (id: number) => Promise<void>
}

export function AddedMoneyCard({
  incomes,
  totalIncomes,
  isCurrentMonth,
  formatCurrency,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}: AddedMoneyCardProps) {
  const { t } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<IncomeItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return

    setIsDeleting(true)
    try {
      await onDeleteIncome(pendingDelete.id)
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              {t('settings.addedMoney')}
            </CardTitle>
            <CardDescription>{t('settings.addedMoneyDescription')}</CardDescription>
          </div>
          {isCurrentMonth && (
            <Button variant="outline" size="sm" className="self-start" onClick={onAddIncome}>
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {incomes && incomes.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  {isCurrentMonth && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell
                      className={isCurrentMonth ? 'cursor-pointer hover:underline' : ''}
                      onClick={() => {
                        if (isCurrentMonth) {
                          onEditIncome(income)
                        }
                      }}
                    >
                      {income.description || t('common.noDescription')}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      +{formatCurrency(income.amount)}
                    </TableCell>
                    {isCurrentMonth && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(income)}
                          aria-label={`Delete ${income.description || 'income'}`}
                        >
                          <Minus className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">{t('common.total')}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    +{formatCurrency(totalIncomes)}
                  </TableCell>
                  {isCurrentMonth && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4 border rounded-md">
            {t('settings.noAddedMoney')}
          </p>
        )}
      </CardContent>

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        itemType={t('confirmDelete.income')}
        itemName={
          pendingDelete
            ? `${pendingDelete.description || t('common.noDescription')} - ${formatCurrency(pendingDelete.amount)}`
            : ''
        }
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </Card>
  )
}
