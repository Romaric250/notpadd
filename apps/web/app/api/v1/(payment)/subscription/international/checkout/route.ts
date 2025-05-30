import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';

export async function GET(req: NextRequest) {
  try {
    // const { userId, email, teamId } = await req.json();

    const userId = "user_2hyXzcMFhdtcSKfyWRlnwZNuHpV"
    const email = "lonfonyuyromeo@gmail.com"
    const teamId = "cmbar3x8d00008oh2ak14fv7z"

    const result = await FlutterwaveService.CheckoutWithFlutter(
      { userId, email },
      teamId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
