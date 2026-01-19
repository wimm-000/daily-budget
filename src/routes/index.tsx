import { useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { z } from 'zod'

import { db } from '@/db'
import { users } from '@/db/schema'
import { verifyPassword } from '@/lib/auth'
import { createSession, getSession } from '@/lib/session'
import { eq } from 'drizzle-orm'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/hooks/useLanguage'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

type LoginInput = z.infer<typeof loginSchema>

const login = createServerFn({
  method: 'POST',
})
  .inputValidator((data: LoginInput) => loginSchema.parse(data))
  .handler(async ({ data }: { data: LoginInput }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    })

    if (!user) {
      return { success: false as const, error: 'Invalid email or password' }
    }

    const isValidPassword = await verifyPassword(data.password, user.password)

    if (!isValidPassword) {
      return { success: false as const, error: 'Invalid email or password' }
    }

    // Create session and set cookie
    await createSession(user.id, data.rememberMe ?? false)

    return {
      success: true as const,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  })

// Check if user is already logged in
const checkAuth = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await getSession()
  return { user }
})

export const Route = createFileRoute('/')({
  component: LoginPage,
  beforeLoad: async () => {
    const { user } = await checkAuth()
    if (user) {
      // Already logged in, redirect to dashboard
      throw redirect({ to: '/dashboard' })
    }
  },
})

function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { language, setLanguage, languages, languageNames } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await login({
        data: { email, password, rememberMe },
      })

      if (!result.success) {
        setError(t('login.invalidCredentials'))
        return
      }

      // Redirect to dashboard after login
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(t('login.unexpectedError'))
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 sm:pt-[10%] bg-background px-4">
      {/* Language selector in top right */}
      <div className="fixed top-4 right-4">
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
      </div>

      <div className="relative w-full max-w-md">
        {/* Cover image circle */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-16 z-10">
          <img
            src="/cover.png"
            alt="Daily Budget"
            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
          />
        </div>
        <Card className="w-full pt-18">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t('login.title')}</CardTitle>
            <CardDescription>
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                {t('login.rememberMe')}
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
