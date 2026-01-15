import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { eq, and, gt, lt } from 'drizzle-orm'
import crypto from 'crypto'

import { db } from '@/db'
import { sessions, users } from '@/db/schema'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_EXPIRY_DAYS = 7
const SESSION_EXPIRY_DAYS_REMEMBER = 30

export type SessionUser = {
  id: number
  email: string
  role: 'user' | 'admin'
  currency: 'USD' | 'EUR'
}

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: number,
  rememberMe: boolean = false
): Promise<string> {
  const token = generateSessionToken()
  const expiryDays = rememberMe ? SESSION_EXPIRY_DAYS_REMEMBER : SESSION_EXPIRY_DAYS
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

  // Insert session into database
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  })

  // Set the session cookie
  setCookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiryDays * 24 * 60 * 60, // seconds
  })

  return token
}

/**
 * Get the current session and user from the request cookie
 */
export async function getSession(): Promise<SessionUser | null> {
  const token = getCookie(SESSION_COOKIE_NAME)

  if (!token) {
    return null
  }

  // Find valid session
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.token, token),
      gt(sessions.expiresAt, new Date())
    ),
  })

  if (!session) {
    // Invalid or expired session, clear the cookie
    deleteCookie(SESSION_COOKIE_NAME)
    return null
  }

  // Get the user
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })

  if (!user) {
    // User no longer exists, clear session
    await db.delete(sessions).where(eq(sessions.id, session.id))
    deleteCookie(SESSION_COOKIE_NAME)
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    currency: user.currency,
  }
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSession()

  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  return user
}

/**
 * Require admin role - throws error if not admin
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth()

  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN')
  }

  return user
}

/**
 * Destroy the current session (logout)
 */
export async function destroySession(): Promise<void> {
  const token = getCookie(SESSION_COOKIE_NAME)

  if (token) {
    // Delete from database
    await db.delete(sessions).where(eq(sessions.token, token))
    // Clear cookie
    deleteCookie(SESSION_COOKIE_NAME)
  }
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(
    lt(sessions.expiresAt, new Date())
  )
}
