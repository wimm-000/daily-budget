import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useTranslation } from 'react-i18next'
import { Globe, Loader2, LogOut, Monitor, Moon, Sun } from 'lucide-react'

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
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
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, languages, languageNames } = useLanguage()
  const isLoading = useRouterState({ select: (s) => s.status === 'pending' })

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/' })
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              {t('header.dashboard')}
            </Link>
            {showAdminLink && (
              <Link
                to="/admin/users"
                className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium [&.active]:underline [&.active]:underline-offset-4"
              >
                {t('header.users')}
              </Link>
            )}
          </nav>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title={languageNames[language]}
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? 'bg-accent' : ''}
                >
                  {languageNames[lang]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Theme: ${theme}`}
            className="h-9 w-9"
          >
            <ThemeIcon className="h-4 w-4" />
          </Button>

          {/* Logout */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('header.logout')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('header.logoutConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('header.logoutConfirmDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>{t('header.logout')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  )
}
