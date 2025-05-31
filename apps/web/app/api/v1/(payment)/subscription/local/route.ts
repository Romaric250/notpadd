import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';


export async function GET(req: NextRequest) {
  try {
    // const { plan, phone, amount, teamId, email } = await req.json();

    const plan = 'Monthly'; // Default plan, can be changed based on your logic
    const phone = '237650650516'; // Example phone number, should be provided by the user
    const amount = 1000; // Example amount, should be determined based on the plan
    const teamId = 'cmbar3x8d00008oh2ak14fv7z'; // Example team ID, should be provided by the user
    const email = 'lonfonyuyromaric@gmail.com'

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



