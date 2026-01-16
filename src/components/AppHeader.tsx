import { Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { LogOut, Monitor, Moon, Sun } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { destroySession } from '@/lib/session'

// Server function for logout
const logout = createServerFn({
  method: 'POST',
}).handler(async () => {
  await destroySession()
  return { success: true }
})

type AppHeaderProps = {
  showAdminLink?: boolean
}

export function AppHeader({ showAdminLink }: AppHeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/' })
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <img src="/header.png" alt="Daily Budget" className="h-10 w-10 rounded-full object-cover" />
            <span className="hidden sm:inline">Daily Budget</span>
          </Link>
          
          <nav className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium [&.active]:underline [&.active]:underline-offset-4"
            >
              Dashboard
            </Link>
            {showAdminLink && (
              <Link
                to="/admin/users"
                className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium [&.active]:underline [&.active]:underline-offset-4"
              >
                Users
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Theme: ${theme}`}
            className="h-9 w-9"
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  )
}
