import { Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { LogOut, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/' })
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5" />
            <span className="hidden sm:inline">Daily Budget</span>
          </Link>
          
          <nav className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeProps={{ className: 'text-foreground font-medium' }}
            >
              Dashboard
            </Link>
            {showAdminLink && (
              <Link
                to="/admin/users"
                className="text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: 'text-foreground font-medium' }}
              >
                Users
              </Link>
            )}
          </nav>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
