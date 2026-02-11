import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import dotenvFlow from 'dotenv-flow';
import { Pool } from 'pg';

import { PrismaClient } from '@/generated/client/client.js';

let prisma: PrismaClient | null = null;
let pool: Pool | null = null;

dotenvFlow.config({ silent: true });

/**
 * Get test database URL
 * Uses DATABASE_URL from env but appends _test suffix to database name
 */
function getTestDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres_dev_password@localhost:5432/app_dev';

  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);
  url.pathname = `/${dbName}_test`;

  return url.toString();
}

/**
 * Execute a database operation using admin connection to postgres database
 * Used for operations that need to be performed outside the test database
 */
async function executeAsAdmin(
  operation: (prisma: PrismaClient) => Promise<void>
): Promise<void> {
  const testDatabaseUrl = getTestDatabaseUrl();
  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = '/postgres';

  const adminPool = new Pool({ connectionString: adminUrl.toString() });
  const adminAdapter = new PrismaPg(adminPool);
  const adminPrisma = new PrismaClient({ adapter: adminAdapter });

  try {
    await adminPrisma.$connect();
    await operation(adminPrisma);
  } finally {
    await adminPrisma.$disconnect();
    await adminPool.end();
  }
}

/**
 * Setup test database before running tests
 * - Drops and recreates test database for clean slate
 * - Runs migrations
 * - Creates Prisma client instance
 */
export async function setupTestDatabase(): Promise<void> {
  const testDatabaseUrl = getTestDatabaseUrl();
  const url = new URL(testDatabaseUrl);
  const testDbName = url.pathname.slice(1);

  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    console.log('Resetting test database...');

    await executeAsAdmin(async (adminPrisma) => {
      await adminPrisma.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS "${testDbName}" WITH (FORCE);`
      );
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}";`);
    });

    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });

    pool = new Pool({ connectionString: testDatabaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    await prisma.$connect();
    console.log('Test database ready');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleanup test database after tests complete
 * - Disconnects Prisma client
 * - Optionally drops test database (set KEEP_TEST_DB=true to preserve)
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }

  if (pool) {
    await pool.end();
    pool = null;
  }

  if (process.env.KEEP_TEST_DB !== 'true') {
    try {
      const url = new URL(getTestDatabaseUrl());
      const dbName = url.pathname.slice(1);

      console.log('Cleaning up test database...');

      await executeAsAdmin(async (adminPrisma) => {
        await adminPrisma.$executeRawUnsafe(
          `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`
        );
      });

      console.log('Test database cleaned up');
    } catch (error) {
      console.warn('Test database cleanup failed (non-critical)');
    }
  }
}

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      'Test database not initialized. Make sure setupTestDatabase() was called.'
    );
  }
  return prisma;
}

/**
 * Reset test database between tests
 * Truncates all tables while preserving schema
 * Automatically discovers all tables from the database
 */
export async function resetTestDatabase(): Promise<void> {
  const client = getTestPrisma();

  // Get all table names from the database
  const tables = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public';
  `;

  if (tables.length === 0) return;

  // Build the TRUNCATE statement with all tables
  const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');

  // Truncate all tables at once with CASCADE to handle foreign keys
  await client.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
  );
}
