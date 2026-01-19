import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { MoreHorizontal, Plus, Pencil, Trash2, Users } from 'lucide-react'

import { db } from '@/db'
import { users } from '@/db/schema'
import { hashPassword } from '@/lib/auth'
import { getSession } from '@/lib/session'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AppHeader } from '@/components/AppHeader'

// Types
type User = {
  id: number
  email: string
  role: 'user' | 'admin'
  avatar: string | null
  createdAt: Date | null
}

// Server Functions
const getUsers = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await getSession()
  if (!session) {
    throw redirect({ to: '/' })
  }
  if (session.role !== 'admin') {
    throw redirect({ to: '/dashboard' })
  }

  const result = await db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  })
  return result as User[]
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'admin']),
})

type CreateUserInput = z.infer<typeof createUserSchema>

const createUser = createServerFn({
  method: 'POST',
})
  .inputValidator((data: CreateUserInput) => createUserSchema.parse(data))
  .handler(async ({ data }: { data: CreateUserInput }) => {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    })

    if (existing) {
      return { success: false, error: 'Email already exists' }
    }

    const hashedPassword = await hashPassword(data.password)

    await db.insert(users).values({
      email: data.email,
      password: hashedPassword,
      role: data.role,
    })

    return { success: true }
  })

const updateUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(['user', 'admin']),
})

type UpdateUserInput = z.infer<typeof updateUserSchema>

const updateUser = createServerFn({
  method: 'POST',
})
  .inputValidator((data: UpdateUserInput) => updateUserSchema.parse(data))
  .handler(async ({ data }: { data: UpdateUserInput }) => {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }

    const updateData: { email: string; role: 'user' | 'admin'; password?: string } = {
      email: data.email,
      role: data.role,
    }

    if (data.password && data.password.length >= 6) {
      updateData.password = await hashPassword(data.password)
    }

    await db.update(users).set(updateData).where(eq(users.id, data.id))

    return { success: true }
  })

const deleteUser = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }

    // Prevent admin from deleting themselves
    if (data.id === session.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    await db.delete(users).where(eq(users.id, data.id))
    return { success: true }
  })

// Route
export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
  loader: async () => await getUsers(),
})

function AdminUsersPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const userList = Route.useLoaderData()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setRole('user')
    setError(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await createUser({ data: { email, password, role } })
      if (!result.success) {
        const errorMsg = 'error' in result ? result.error : t('admin.failedToCreate')
        setError(errorMsg === 'Email already exists' ? t('admin.emailExists') : (errorMsg || t('admin.failedToCreate')))
        return
      }
      setIsCreateOpen(false)
      resetForm()
      router.invalidate()
    } catch (err) {
      setError(t('login.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateUser({
        data: {
          id: selectedUser.id,
          email,
          password: password || undefined,
          role,
        },
      })
      if (!result.success) {
        setError(t('admin.failedToUpdate'))
        return
      }
      setIsEditOpen(false)
      resetForm()
      router.invalidate()
    } catch (err) {
      setError(t('login.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setIsLoading(true)

    try {
      await deleteUser({ data: { id: selectedUser.id } })
      setIsDeleteOpen(false)
      setSelectedUser(null)
      router.invalidate()
    } catch (err) {
      console.error('Failed to delete user:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const openEdit = (user: User) => {
    setSelectedUser(user)
    setEmail(user.email)
    setPassword('')
    setRole(user.role)
    setError(null)
    setIsEditOpen(true)
  }

  const openDelete = (user: User) => {
    setSelectedUser(user)
    setIsDeleteOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showAdminLink />
      
      <main className="p-8" style={{ viewTransitionName: 'page-content' }}>
        <div className="max-w-6xl mx-auto">
          <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                <div>
                  <CardTitle>{t('admin.title')}</CardTitle>
                  <CardDescription>
                    {t('admin.description')}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true) }} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.addUser')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.email')}</TableHead>
                  <TableHead>{t('admin.role')}</TableHead>
                  <TableHead>{t('admin.created')}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userList?.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? t('admin.adminRole') : t('admin.user')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDelete(user)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createUser')}</DialogTitle>
              <DialogDescription>
                {t('admin.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="create-email">{t('admin.email')}</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">{t('login.password')}</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">{t('admin.role')}</Label>
                  <select
                    id="create-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="user">{t('admin.user')}</option>
                    <option value="admin">{t('admin.adminRole')}</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('admin.creating') : t('admin.createUser')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.editUser')}</DialogTitle>
              <DialogDescription>
                {t('admin.editDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-email">{t('admin.email')}</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">{t('login.password')}</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('admin.passwordPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">{t('admin.role')}</Label>
                  <select
                    id="edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="user">{t('admin.user')}</option>
                    <option value="admin">{t('admin.adminRole')}</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.deleteUser')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.deleteDescription', { email: selectedUser?.email })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? t('common.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </main>
    </div>
  )
}
