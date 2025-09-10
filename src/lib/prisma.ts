import { PrismaClient } from '@prisma/client'

// Reuse PrismaClient between HMR reloads in development to prevent
// exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
