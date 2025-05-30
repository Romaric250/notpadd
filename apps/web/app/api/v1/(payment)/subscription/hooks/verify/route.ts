import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';


export async function POST(req: NextRequest) {
  try {
    const {
      transactionId,
      expectedAmount,
      expectedCurrency,
      userId,
      txt_ref,
    } = await req.json();

    const result = await FlutterwaveService.verifyTransaction(
      transactionId,
      expectedAmount,
      expectedCurrency,
      userId,
      txt_ref
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
