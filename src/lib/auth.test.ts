import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './auth'

describe('hashPassword', () => {
  it('returns a hashed string different from the input', async () => {
    const password = 'mySecurePassword123'
    const hash = await hashPassword(password)
    
    expect(hash).not.toBe(password)
    expect(typeof hash).toBe('string')
  })

  it('returns a bcrypt formatted hash', async () => {
    const password = 'testPassword'
    const hash = await hashPassword(password)
    
    // bcrypt hashes start with $2b$ or $2a$ and are 60 characters
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/)
    expect(hash.length).toBe(60)
  })

  it('generates different hashes for the same password (salt)', async () => {
    const password = 'samePassword'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    
    expect(hash1).not.toBe(hash2)
  })

  it('handles empty string', async () => {
    const hash = await hashPassword('')
    
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/)
    expect(hash.length).toBe(60)
  })

  it('handles special characters', async () => {
    const password = 'p@$$w0rd!#%&*()[]{}|;:,.<>?'
    const hash = await hashPassword(password)
    
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/)
  })

  it('handles unicode characters', async () => {
    const password = 'contraseña密码パスワード🔐'
    const hash = await hashPassword(password)
    
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/)
  })

  it('handles very long passwords', async () => {
    const password = 'a'.repeat(100)
    const hash = await hashPassword(password)
    
    expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'correctPassword'
    const hash = await hashPassword(password)
    
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })

  it('returns false for incorrect password', async () => {
    const password = 'correctPassword'
    const wrongPassword = 'wrongPassword'
    const hash = await hashPassword(password)
    
    const result = await verifyPassword(wrongPassword, hash)
    expect(result).toBe(false)
  })

  it('returns false for similar but different passwords', async () => {
    const password = 'myPassword123'
    const hash = await hashPassword(password)
    
    // Case difference
    expect(await verifyPassword('MyPassword123', hash)).toBe(false)
    // Extra character
    expect(await verifyPassword('myPassword1234', hash)).toBe(false)
    // Missing character
    expect(await verifyPassword('myPassword12', hash)).toBe(false)
    // Different character
    expect(await verifyPassword('myPassword124', hash)).toBe(false)
  })

  it('handles empty password correctly', async () => {
    const emptyHash = await hashPassword('')
    
    expect(await verifyPassword('', emptyHash)).toBe(true)
    expect(await verifyPassword(' ', emptyHash)).toBe(false)
    expect(await verifyPassword('anyPassword', emptyHash)).toBe(false)
  })

  it('handles special characters', async () => {
    const password = 'p@$$w0rd!#%&*()[]{}|;:,.<>?'
    const hash = await hashPassword(password)
    
    expect(await verifyPassword(password, hash)).toBe(true)
    expect(await verifyPassword('p@$$w0rd!#%&*()[]{}|;:,.<>?X', hash)).toBe(false)
  })

  it('handles unicode characters', async () => {
    const password = 'contraseña密码パスワード🔐'
    const hash = await hashPassword(password)
    
    expect(await verifyPassword(password, hash)).toBe(true)
    expect(await verifyPassword('contraseña密码パスワード', hash)).toBe(false)
  })

  it('works with different hashes of the same password', async () => {
    const password = 'samePassword'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)
    
    // Both hashes should verify the same password
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)
    
    // Hashes are different but both valid
    expect(hash1).not.toBe(hash2)
  })
})

describe('integration: hash and verify flow', () => {
  it('full registration/login flow simulation', async () => {
    // Simulate user registration
    const userPassword = 'SecureUserPassword123!'
    const storedHash = await hashPassword(userPassword)
    
    // Simulate user login with correct password
    const loginAttempt1 = await verifyPassword(userPassword, storedHash)
    expect(loginAttempt1).toBe(true)
    
    // Simulate login with incorrect password
    const loginAttempt2 = await verifyPassword('WrongPassword', storedHash)
    expect(loginAttempt2).toBe(false)
  })

  it('password change flow simulation', async () => {
    const oldPassword = 'oldPassword123'
    const newPassword = 'newPassword456'
    
    // Initial hash (registration)
    const oldHash = await hashPassword(oldPassword)
    
    // Verify old password still works
    expect(await verifyPassword(oldPassword, oldHash)).toBe(true)
    
    // Change password - create new hash
    const newHash = await hashPassword(newPassword)
    
    // Old password should not work with new hash
    expect(await verifyPassword(oldPassword, newHash)).toBe(false)
    
    // New password should work with new hash
    expect(await verifyPassword(newPassword, newHash)).toBe(true)
    
    // New password should not work with old hash (important security check)
    expect(await verifyPassword(newPassword, oldHash)).toBe(false)
  })
})
