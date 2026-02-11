import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(request: Request) {
    try {
        const { qrCode } = await request.json()

        if (!qrCode) {
            return NextResponse.json({ error: 'QR Code required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { qrCode },
        })

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // Calcular el inicio y fin del día actual en Zona Horaria de Perú (UTC-5)
        const now = new Date()
        const peruNow = new Date(now.getTime() - (5 * 60 * 60 * 1000))
        const peruDayStr = peruNow.toISOString().split('T')[0] // 'YYYY-MM-DD'

        // El día en Perú (00:00 a 23:59) corresponde a (05:00 a 04:59 del día siguiente) en UTC
        const startOfPeruDay = new Date(`${peruDayStr}T05:00:00Z`)
        const endOfPeruDay = new Date(startOfPeruDay.getTime() + (24 * 60 * 60 * 1000) - 1)

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                timestamp: {
                    gte: startOfPeruDay,
                    lte: endOfPeruDay
                }
            }
        })

        // Si ya existe, lo borramos para que el nuevo registro sea el que valga (reemplazo)
        if (existingAttendance) {
            await prisma.attendance.delete({
                where: { id: existingAttendance.id }
            })
        }

        const attendance = await prisma.attendance.create({
            data: { userId: user.id },
        })

        return NextResponse.json({
            success: true,
            alreadyRegistered: !!existingAttendance,
            user: user.fullName,
            time: attendance.timestamp,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Error logging attendance' }, { status: 500 })
    }
}
