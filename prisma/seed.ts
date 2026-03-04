import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando seeding...')

    // Limpiar datos existentes (opcional, activar si se desea resetear)
    // await prisma.attendance.deleteMany({})
    // await prisma.user.deleteMany({})

    const communityNumbers = ['1', '2', '3', '4', '5', '6', '7', '8']

    const firstNames = ['Juan', 'Maria', 'Pedro', 'Ana', 'Luis', 'Rosa', 'Carlos', 'Elena', 'Jose', 'Carmen', 'Miguel', 'Lucia', 'Roberto', 'Sofia', 'Fernando', 'Isabel']
    const lastNames = ['Garcia', 'Rodriguez', 'Lopez', 'Martinez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Chavez', 'Medina', 'Flores', 'Samame', 'Chozo', 'Villacorta']

    const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

    // Crear 20 usuarios individuales
    for (let i = 0; i < 20; i++) {
        const firstName = getRandom(firstNames)
        const lastName1 = getRandom(lastNames)
        const lastName2 = getRandom(lastNames)
        const fullName = `${firstName} ${lastName1} ${lastName2}`

        await prisma.user.create({
            data: {
                fullName: fullName.toUpperCase(),
                communityNumber: getRandom(communityNumbers),
                gender: Math.random() > 0.5 ? 'M' : 'F',
                isActive: true,
            }
        })
    }

    // Crear 5 parejas
    for (let i = 0; i < 5; i++) {
        const lastName = getRandom(lastNames)
        const comNum = getRandom(communityNumbers)

        const hName = `${getRandom(firstNames)} ${lastName} ${getRandom(lastNames)}`.toUpperCase()
        const mName = `${getRandom(firstNames)} ${lastName} ${getRandom(lastNames)}`.toUpperCase()

        const husband = await prisma.user.create({
            data: {
                fullName: hName,
                communityNumber: comNum,
                gender: 'M',
                isActive: true,
            }
        })

        const wife = await prisma.user.create({
            data: {
                fullName: mName,
                communityNumber: comNum,
                gender: 'F',
                isActive: true,
                partnerId: husband.id
            }
        })

        // Actualizar el esposo con el ID de la esposa (vínculo bidireccional en la app)
        // Aunque el esquema dice @unique partnerId, en la práctica lo manejamos así
    }

    console.log('Seeding completado con éxito.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
