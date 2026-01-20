import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPermissions, getAvailablePaymentMethods, type OperationType } from '@/lib/services/user-permissions';

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
    const operation = searchParams.get('operation') as OperationType | null;

    // Get user permissions
    const permissions = await getUserPermissions(session.user.id);

    // Get available payment methods if requested
    let paymentMethods = null;
    if (searchParams.has('includePaymentMethods')) {
      paymentMethods = await getAvailablePaymentMethods(session.user.id, operation || undefined);
    }

    return NextResponse.json({
      permissions,
      paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    );
  }
}