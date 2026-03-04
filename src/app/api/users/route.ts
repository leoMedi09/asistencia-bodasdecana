import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { fullName: 'asc' },
        })
        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { fullName, communityNumber } = await request.json()

        // Generamos el QR explícitamente para asegurar consistencia inmediata
        const qrCode = randomUUID()

        const user = await prisma.user.create({
            data: {
                fullName,
                communityNumber: communityNumber || null,
                qrCode
            },
        })
        return NextResponse.json(user)
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const userId = parseInt(id)

        // First delete all attendances for this user
        await prisma.attendance.deleteMany({
            where: { userId }
        })

        // Then delete the user
        await prisma.user.delete({
            where: { id: userId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Error deleting user' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, fullName, communityNumber } = await request.json()

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                fullName,
                communityNumber: communityNumber || null
            },
        })

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Error updating user' }, { status: 500 })
    }
}
