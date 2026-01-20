import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkRequiredApiKeys, type OperationType } from '@/lib/services/user-permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation') as OperationType;

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation type is required' },
        { status: 400 }
      );
    }

    const result = await checkRequiredApiKeys(session.user.id, operation);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking API keys:', error);
    return NextResponse.json(
      { error: 'Failed to check API keys' },
      { status: 500 }
    );
  }
}