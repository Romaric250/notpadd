import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';


export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("Webhook data received:", data);
    const result = await FlutterwaveService.Paymentwebhook(data);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
