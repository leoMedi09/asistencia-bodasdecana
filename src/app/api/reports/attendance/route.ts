import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function GET() {
    try {
        const attendances = await prisma.attendance.findMany({
            include: {
                user: true,
            },
            orderBy: {
                timestamp: 'desc',
            },
        })

        const reportData = attendances.map((record) => ({
            ID: record.user.id.toString().padStart(4, '0'),
            Fecha: format(record.timestamp, 'dd/MM/yyyy', { locale: es }),
            Hora: format(record.timestamp, 'HH:mm:ss', { locale: es }),
            Nombre: record.user.fullName,
            Comunidad: record.user.communityNumber || 'S/N',
            qrCode: record.user.qrCode,
        }))

        return NextResponse.json(reportData)
    } catch (error) {
        console.error('Error generating report data:', error)
        return NextResponse.json({ error: 'Error fetching attendance data' }, { status: 500 })
    }
}
