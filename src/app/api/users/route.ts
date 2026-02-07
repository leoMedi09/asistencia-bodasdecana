import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
    try {
        const { fullName, communityNumber } = await request.json()
        const user = await prisma.user.create({
            data: {
                fullName,
                communityNumber: communityNumber || null
            },
        })
        return NextResponse.json(user)
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

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

export async function PATCH(request: Request) {
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
