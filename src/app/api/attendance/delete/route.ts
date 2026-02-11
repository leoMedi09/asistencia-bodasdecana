import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const dateStr = searchParams.get('date') // formato dd/MM/yyyy

        if (!userId || !dateStr) {
            return NextResponse.json({ error: 'UserId and Date required' }, { status: 400 })
        }

        const [day, month, year] = dateStr.split('/').map(Number)

        // El día local de Perú (UTC-5) 00:00 a 23:59
        // corresponde a 05:00 UTC (mismo día) hasta 04:59 UTC (día siguiente)
        const startOfPeruDay = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
        const endOfPeruDay = new Date(startOfPeruDay.getTime() + (24 * 60 * 60 * 1000) - 1)

        const deleted = await prisma.attendance.deleteMany({
            where: {
                userId: parseInt(userId),
                timestamp: {
                    gte: startOfPeruDay,
                    lte: endOfPeruDay
                }
            }
        })

        return NextResponse.json({ success: true, count: deleted.count })
    } catch (error) {
        console.error('Error deleting attendance:', error)
        return NextResponse.json({ error: 'Error deleting attendance' }, { status: 500 })
    }
}
