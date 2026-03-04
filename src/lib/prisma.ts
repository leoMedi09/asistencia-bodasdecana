import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient() {
    // Si no hay URL o estamos en fase de build/static analysis,
    // devolvemos un cliente básico sin adaptador para evitar errores de 'bind'
    if (!process.env.TURSO_DATABASE_URL || process.env.NEXT_PHASE === 'phase-production-build') {
        return new PrismaClient()
    }

    try {
        // Usamos require dinámico para evitar cargar librerías nativas durante el build
        const { PrismaLibSQL } = require('@prisma/adapter-libsql')
        const { createClient } = require('@libsql/client')

        const libsql = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        })

        const adapter = new PrismaLibSQL(libsql)
        return new PrismaClient({ adapter } as any)
    } catch (e) {
        console.warn("Prisma initialization failed, falling back to default client", e)
        return new PrismaClient()
    }
}

// Singleton pattern con inicialización perezosa real
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
