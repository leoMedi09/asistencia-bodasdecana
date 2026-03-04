import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const createPrisma = () => {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    // En Vercel (runtime) usamos el adaptador de Turso
    if (url && authToken && process.env.NODE_ENV === 'production') {
        const libsql = createClient({ url, authToken })
        const adapter = new PrismaLibSQL(libsql)
        return new PrismaClient({ adapter } as any)
    }

    // En local o durante el build (si faltan variables), usamos el cliente estándar 
    // que buscará DATABASE_URL en el .env (configurado como file:./dev.db)
    return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
