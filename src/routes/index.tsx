import { useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
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
      // Already logged in, redirect based on role
      if (user.role === 'admin') {
        throw redirect({ to: '/admin/users' })
      } else {
        throw redirect({ to: '/dashboard' })
      }
    }
  },
})

function LoginPage() {
  const navigate = useNavigate()
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
        setError(result.error || 'Login failed')
        return
      }

      // Redirect based on role
      if (result.user.role === 'admin') {
        navigate({ to: '/admin/users' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-[10%] bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Daily Budget</CardTitle>
          <CardDescription>
            Sign in to manage your daily budget
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
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
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
