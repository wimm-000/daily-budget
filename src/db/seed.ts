import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })

async function seed() {
  const { db } = await import('./index')
  const { users } = await import('./schema')
  const { hashPassword } = await import('@/lib/auth')

  console.log('Seeding database...')

  // Create default admin user
  const adminPassword = await hashPassword('admin123')

  await db
    .insert(users)
    .values({
      email: 'admin@dailybudget.local',
      password: adminPassword,
      role: 'admin',
    })
    .onConflictDoNothing()

  console.log('Default admin user created:')
  console.log('  Email: admin@dailybudget.local')
  console.log('  Password: admin123')
  console.log('')
  console.log('IMPORTANT: Change the admin password after first login!')
  console.log('')
  console.log('Seeding complete!')
}

seed().catch((error) => {
  console.error('Seeding failed:', error)
  process.exit(1)
})
