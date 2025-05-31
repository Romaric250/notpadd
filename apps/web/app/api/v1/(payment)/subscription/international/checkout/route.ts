import { NextRequest, NextResponse } from 'next/server';
import FlutterwaveService from '@/hooks/payment.services';
import { getCurrentUser } from '@/lib/current-user';
import { db } from '@workspace/db';

export async function POST(req: NextRequest) {
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

// delete all subsriptions for all teams

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.subscription.deleteMany({
      where: {
        teamId: "cmbar3x8d00008oh2ak14fv7z", // Replace with the actual team ID or logic to get it
      },
    });

    await db.initiatePayment.deleteMany({
      where: {
        teamId: "cmbar3x8d00008oh2ak14fv7z", // Delete all subscriptions for the current user
      },
    });

    return NextResponse.json({ message: 'All subscriptions deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
