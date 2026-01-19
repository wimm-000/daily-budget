import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type MonthNavigationProps = {
  /** Formatted month/year string to display */
  formattedMonthYear: string
  /** Whether viewing the current month */
  isCurrentMonth: boolean
  /** Whether can navigate to next month */
  canGoNext: boolean
  /** Callback when navigating to previous month */
  onPrevious: () => void
  /** Callback when navigating to next month */
  onNext: () => void
  /** Callback when navigating to current month */
  onGoToCurrent: () => void
}

/**
 * Month navigation header with previous/next buttons
 */
export function MonthNavigation({
  formattedMonthYear,
  isCurrentMonth,
  canGoNext,
  onPrevious,
  onNext,
  onGoToCurrent,
}: MonthNavigationProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="icon" onClick={onPrevious}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">{formattedMonthYear}</h2>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={onGoToCurrent}>
            {t('common.today')}
          </Button>
        )}
      </div>
      <Button variant="outline" size="icon" onClick={onNext} disabled={!canGoNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

type PastMonthNoticeProps = {
  /** Formatted month/year string */
  formattedMonthYear: string
  /** Callback when clicking to go to current month */
  onGoToCurrent: () => void
}

/**
 * Notice banner shown when viewing a past month
 */
export function PastMonthNotice({ formattedMonthYear, onGoToCurrent }: PastMonthNoticeProps) {
  const { t } = useTranslation()

  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-700 dark:text-yellow-300">
      {t('navigation.viewingHistorical', { month: formattedMonthYear })}
      <Button
        variant="link"
        className="h-auto p-0 ml-1 text-yellow-700 dark:text-yellow-300 underline"
        onClick={onGoToCurrent}
      >
        {t('navigation.goToCurrent')}
      </Button>
    </div>
  )
}
