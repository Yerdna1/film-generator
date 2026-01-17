import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                email: 'andrej.galad@gmail.com'
            },
            include: {
                projects: true
            }
        });

        return NextResponse.json({
            user,
            projectCount: user?.projects.length || 0,
            databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@') // Hide password
        });
    } catch (error) {
        console.error('Debug user error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
