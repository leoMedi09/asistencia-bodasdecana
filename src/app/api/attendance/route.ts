import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function POST(request: Request) {
    try {
        const { qrCode, date } = await request.json()

        if (!qrCode) {
            return NextResponse.json({ error: 'QR Code required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { qrCode },
        })

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
        }

        // Definir la fecha del registro
        let attendanceDate: Date;

        // Obtener la hora actual del servidor y ajustarla a la de Perú (UTC-5)
        const nowUTC = new Date();
        const peruTimeNow = new Date(nowUTC.getTime() - (5 * 60 * 60 * 1000));

        if (date) {
            // Caso: Registro manual/retroactiva. Ya viene "DD/MM/YYYY" de la tabla.
            const [day, month, year] = date.split('/').map(Number);
            // Creamos la fecha a las 12 PM de ese día para evitar solapamientos
            attendanceDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        } else {
            // Caso: Escáner QR (tiempo real). Usamos la hora ajustada a Perú.
            attendanceDate = peruTimeNow;
        }

        // Determinar el inicio y fin del día en Perú para PREVENIR DUPLICADOS
        // Extraemos solo el año, mes y día de la fecha de "Perú"
        const peruYear = attendanceDate.getUTCFullYear();
        const peruMonth = attendanceDate.getUTCMonth();
        const peruDay = attendanceDate.getUTCDate();

        // El rango de búsqueda para duplicados debe ser el día completo de Perú
        const startOfDay = new Date(Date.UTC(peruYear, peruMonth, peruDay, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(peruYear, peruMonth, peruDay, 23, 59, 59, 999));

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId: user.id,
                timestamp: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })

        // Si ya existe, lo borramos para que el nuevo registro sea el que valga
        if (existingAttendance) {
            await prisma.attendance.delete({
                where: { id: existingAttendance.id }
            })
        }

        const attendance = await prisma.attendance.create({
            data: {
                userId: user.id,
                timestamp: attendanceDate
            },
        })

        return NextResponse.json({
            success: true,
            updated: !!existingAttendance,
            user: user.fullName,
            time: attendance.timestamp,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Error logging attendance' }, { status: 500 })
    }
}
