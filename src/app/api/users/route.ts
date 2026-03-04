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
        const { fullName, communityNumber, isCouple, partnerName } = await request.json()

        if (isCouple && partnerName) {
            const result = await prisma.$transaction(async (tx) => {
                const user1 = await tx.user.create({
                    data: {
                        fullName,
                        communityNumber: communityNumber || null,
                        qrCode: randomUUID()
                    }
                })

                const user2 = await tx.user.create({
                    data: {
                        fullName: partnerName,
                        communityNumber: communityNumber || null,
                        qrCode: randomUUID(),
                        partnerId: user1.id
                    }
                })

                // Back-link
                const updatedUser1 = await tx.user.update({
                    where: { id: user1.id },
                    data: { partnerId: user2.id }
                })

                return [updatedUser1, user2]
            })
            return NextResponse.json(result[0])
        }

        const user = await prisma.user.create({
            data: {
                fullName,
                communityNumber: communityNumber || null,
                qrCode: randomUUID()
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

        await prisma.attendance.deleteMany({ where: { userId } })

        // Handle partnerId cleanup if exists
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user?.partnerId) {
            await prisma.user.update({
                where: { id: user.partnerId },
                data: { partnerId: null }
            })
        }

        await prisma.user.delete({ where: { id: userId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json({ error: 'Error deleting user' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, fullName, communityNumber, partnerId, partnerName } = await request.json()
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: parseInt(id) },
                data: {
                    fullName,
                    communityNumber: communityNumber || null
                },
            })

            if (partnerId && partnerName) {
                await tx.user.update({
                    where: { id: parseInt(partnerId) },
                    data: {
                        fullName: partnerName,
                        communityNumber: communityNumber || null
                    }
                })
            }
            return updatedUser
        })
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json({ error: 'Error updating user' }, { status: 500 })
    }
}
