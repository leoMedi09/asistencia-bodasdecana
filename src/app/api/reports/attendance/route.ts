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

        const reportData = attendances.map((record) => {
            // Ajustar a zona horaria de Perú (UTC-5) para el reporte
            const peruDate = new Date(record.timestamp.getTime() - (5 * 60 * 60 * 1000));
            const dateParts = peruDate.toISOString().split('T')[0].split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // dd/MM/yyyy
            const formattedTime = peruDate.toISOString().split('T')[1].split('.')[0]; // HH:mm:ss

            return {
                ID: record.user.id.toString().padStart(4, '0'),
                Fecha: formattedDate,
                Hora: formattedTime,
                Nombre: record.user.fullName,
                Comunidad: record.user.communityNumber || 'S/N',
                qrCode: record.user.qrCode,
            };
        })

        return NextResponse.json(reportData)
    } catch (error) {
        console.error('Error generating report data:', error)
        return NextResponse.json({ error: 'Error fetching attendance data' }, { status: 500 })
    }
}
