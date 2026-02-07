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

        // Check if already checked in today (optional, but good)
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date()
        endOfDay.setHours(23, 59, 59, 999)

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })

        if (existingAttendance) {
            return NextResponse.json({
                success: true,
                alreadyRegistered: true,
                user: user.fullName,
                time: existingAttendance.timestamp,
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
