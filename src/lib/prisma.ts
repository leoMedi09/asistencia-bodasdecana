import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // Si no hay URL (como en el build de Vercel), usamos un cliente básico
    // para que Next.js pueda analizar los tipos sin levantar la base de datos
    if (!process.env.TURSO_DATABASE_URL) {
        return new PrismaClient()
    }

    // Usamos require dinámico para que los módulos problemáticos 
    // no se carguen en el scope global del build
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')

    const libsql = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    })

    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as any)
}

// Singleton pattern
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
