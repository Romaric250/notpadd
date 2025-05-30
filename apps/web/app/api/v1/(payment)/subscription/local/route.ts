import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';


export async function POST(req: NextRequest) {
  try {
    const { plan, phone, amount, teamId, email } = await req.json();

    const user = await getCurrentUser()
  
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    if (!phone || !amount || !teamId || !email) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await FlutterwaveService.localInitiateCharge(
      plan,
      phone,
      amount,
      teamId,
      userId,
      email
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
