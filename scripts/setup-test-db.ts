/**
 * Setup Test Database
 *
 * This script creates the test database 'filmtest' in Neon
 * Run with: npx tsx scripts/setup-test-db.ts
 */

import { Client } from 'pg'

async function setupTestDatabase() {
  // Connect to the default database to create test database
  const adminClient = new Client({
    connectionString: process.env.DIRECT_URL ||
      'postgresql://neondb_owner:npg_0c5LeAwahPry@ep-hidden-meadow-ag73hwfb.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  })

  try {
    await adminClient.connect()
    console.log('Connected to Neon database')

    // Check if test database exists
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'filmtest'"
    )

    if (result.rows.length === 0) {
      console.log('Creating test database: filmtest')
      await adminClient.query('CREATE DATABASE filmtest')
      console.log('Test database created successfully!')
    } else {
      console.log('Test database already exists')
    }

    await adminClient.end()

    // Now push the schema to test database
    console.log('\nPushing Prisma schema to test database...')
    const { execSync } = await import('child_process')

    execSync(
      'DATABASE_URL="postgresql://neondb_owner:npg_0c5LeAwahPry@ep-hidden-meadow-ag73hwfb-pooler.c-2.eu-central-1.aws.neon.tech/filmtest?sslmode=require" DIRECT_URL="postgresql://neondb_owner:npg_0c5LeAwahPry@ep-hidden-meadow-ag73hwfb.c-2.eu-central-1.aws.neon.tech/filmtest?sslmode=require" npx prisma db push --skip-generate',
      { stdio: 'inherit' }
    )

    console.log('\n✅ Test database setup complete!')
    console.log('\nTo run tests:')
    console.log('  npm run test')

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('Test database already exists')
    } else {
      console.error('Error setting up test database:', error)
      process.exit(1)
    }
  }
}

setupTestDatabase()
