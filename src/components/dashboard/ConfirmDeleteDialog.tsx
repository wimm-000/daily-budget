import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ConfirmDeleteDialogProps = {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Type of item being deleted (e.g., "expense", "fixed expense", "income") */
  itemType: string
  /** Display name of the item being deleted */
  itemName: string
  /** Callback when user confirms deletion */
  onConfirm: () => void
  /** Whether deletion is in progress */
  isLoading?: boolean
}

/**
 * Reusable confirmation dialog for delete actions
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  itemType,
  itemName,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing the dialog while loading
    if (isLoading) return
    onOpenChange(newOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{itemName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
