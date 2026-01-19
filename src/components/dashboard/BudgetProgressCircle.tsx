type BudgetProgressCircleProps = {
  /** Total budget available (daily budget + carryover) */
  totalBudget: number
  /** Amount spent */
  spent: number
  /** Amount remaining (can be negative if overspent) */
  remaining: number
  /** Size of the circle (default: 100) */
  size?: number
}

/**
 * Circular progress indicator showing budget usage
 */
export function BudgetProgressCircle({
  totalBudget,
  spent,
  remaining,
  size = 100,
}: BudgetProgressCircleProps) {
  const isOverspent = remaining < 0

  // Calculate percentage (0-100), capped for display
  let spentPercent = totalBudget > 0 ? (spent / totalBudget) * 100 : 0
  if (isOverspent) {
    spentPercent = 100 + Math.min(50, (Math.abs(remaining) / totalBudget) * 50)
  }
  spentPercent = Math.min(spentPercent, 150) // Cap at 150% for visual

  const radius = (size - 20) / 2
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const spentOffset = circumference - (Math.min(spentPercent, 100) / 100) * circumference
  const overspentOffset = isOverspent
    ? circumference - ((spentPercent - 100) / 50) * circumference
    : circumference

  const displayPercent = Math.round(isOverspent ? spentPercent - 100 : 100 - spentPercent)

  return (
    <div className="relative flex-shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/30"
        />
        {/* Spent portion (green when under budget, yellow when at/over) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={spentOffset}
          strokeLinecap="round"
          className={isOverspent ? 'text-yellow-500' : 'text-green-500'}
        />
        {/* Overspent portion (red) */}
        {isOverspent && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={overspentOffset}
            strokeLinecap="round"
            className="text-destructive"
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-lg font-bold ${isOverspent ? 'text-destructive' : 'text-green-600'}`}
        >
          {isOverspent ? '-' : ''}
          {displayPercent}%
        </span>
        <span className="text-[10px] text-muted-foreground">{isOverspent ? 'over' : 'left'}</span>
      </div>
    </div>
  )
}

type MonthProgressCircleProps = {
  /** Total monthly budget */
  monthlyBudget: number
  /** Total spent this month */
  spent: number
  /** Size of the circle (default: 100) */
  size?: number
}

/**
 * Circular progress indicator for monthly budget overview (past months)
 */
export function MonthProgressCircle({ monthlyBudget, spent, size = 100 }: MonthProgressCircleProps) {
  const isOverspent = spent > monthlyBudget

  let spentPercent = monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0
  if (isOverspent) {
    spentPercent = 100 + Math.min(50, ((spent - monthlyBudget) / monthlyBudget) * 50)
  }
  spentPercent = Math.min(spentPercent, 150)

  const radius = (size - 20) / 2
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const spentOffset = circumference - (Math.min(spentPercent, 100) / 100) * circumference
  const overspentOffset = isOverspent
    ? circumference - ((spentPercent - 100) / 50) * circumference
    : circumference

  return (
    <div className="relative flex-shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={spentOffset}
          strokeLinecap="round"
          className={isOverspent ? 'text-yellow-500' : 'text-green-500'}
        />
        {isOverspent && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={overspentOffset}
            strokeLinecap="round"
            className="text-destructive"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-lg font-bold ${isOverspent ? 'text-destructive' : 'text-green-600'}`}
        >
          {Math.round(Math.min(spentPercent, 100))}%
        </span>
        <span className="text-[10px] text-muted-foreground">used</span>
      </div>
    </div>
  )
}
