import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const url = process.env.TURSO_DATABASE_URL || "file:./dev.db"
const authToken = process.env.TURSO_AUTH_TOKEN

const libsql = createClient({
    url,
    authToken,
})

const adapter = new PrismaLibSQL(libsql)

export const prisma =
    globalForPrisma.prisma ?? new PrismaClient({ adapter } as any)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Trigger Vercel redeploy with adapter fixes
