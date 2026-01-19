import { Utensils, Car, Tv, ShoppingBag, Receipt, Heart, HelpCircle } from 'lucide-react'
import type { ExpenseCategory } from '@/db/schema'
import type { CategoryConfigMap } from './types'

/**
 * Category configuration for expense display
 */
export const CATEGORY_CONFIG: CategoryConfigMap = {
  food: { label: 'Food & Drinks', icon: Utensils, color: 'text-orange-500' },
  transport: { label: 'Transport', icon: Car, color: 'text-blue-500' },
  entertainment: { label: 'Entertainment', icon: Tv, color: 'text-purple-500' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'text-pink-500' },
  bills: { label: 'Bills', icon: Receipt, color: 'text-yellow-500' },
  health: { label: 'Health', icon: Heart, color: 'text-red-500' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-gray-500' },
}

/**
 * Get category config with fallback to 'other'
 */
export function getCategoryConfig(category: string | null): CategoryConfigMap[ExpenseCategory] {
  const cat = (category || 'other') as ExpenseCategory
  return CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other
}
