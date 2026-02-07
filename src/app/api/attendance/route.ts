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

        // --- Sincronización con Google Sheets ---
        const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                // Usamos la fecha actual para el envío (más fiable que el objeto retornado)
                const now = new Date();
                const payload = {
                    fecha: format(now, 'dd/MM/yyyy', { locale: es }),
                    hora: format(now, 'HH:mm:ss', { locale: es }),
                    nombre: user.fullName,
                    id: user.id.toString(),
                    status: existingAttendance ? "RE-ESCANEO" : "NUEVO"
                };

                console.log('Enviando a Google Sheets:', payload);

                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    console.log('Sincronización con Google Sheets exitosa');
                } else {
                    const errorText = await response.text();
                    console.error('Respuesta de Google Sheets no exitosa:', errorText);
                }
            } catch (err) {
                console.error('Error crítico sincronizando con Sheets:', err);
            }
        }

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
