import axios from 'axios';
import crypto from 'crypto';
import { db, PlanType } from '@workspace/db';
import { addDays, isAfter } from 'date-fns';


const PLAN_DURATIONS: Record<string, number> = {
  Free: Infinity,
  Monthly: 30,
  Yearly: 365,
};

class FlutterwaveService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
  }



  async checkcurrentSubscription(teamId: string) {
    try {
      const subscription = await db.subscription.findFirst({
        where: {
          teamId,
          status: 'active',
        },
      });
      if (!subscription) {
        return {
          message: 'No active subscription found for this team.',
          success: false,
        };
      }
      return {
        message: 'Active subscription found.',
        success: true,
        data: subscription,
      };
    } catch (error: any) {
      console.error('Error checking current subscription:', error.message);
      return {
        message: 'Error checking current subscription',
        success: false,
        error: error.message,
      };
    }
  }

  async getSubscriptionInfo(teamId: string) {
    try {
      const subscription = await db.subscription.findFirst({
        where: {
          teamId,
          status: 'active',
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      if (!subscription) {
        return {
          status: 'inactive',
          expiryDate: undefined,
          plan: 'Free',
        };
      }

      const duration = PLAN_DURATIONS[subscription.plan];

      if (duration === undefined) {
        console.warn(`Unknown plan '${subscription.plan}' for team ${teamId}`);
        return {
          status: 'inactive',
          expiryDate: undefined,
          plan: 'Free',
        };
      }

      if (duration === Infinity) {
        return {
          status: 'active',
          expiryDate: undefined,
          plan: subscription.plan,
        };
      }

      const expiryDate = addDays(new Date(subscription.startDate), duration);

      // If expired but not updated, return inactive
      if (isAfter(new Date(), expiryDate)) {
        return {
          status: 'inactive',
          expiryDate,
          plan: subscription.plan,
        };
      }

      return {
        status: 'active',
        expiryDate,
        plan: subscription.plan,
      };
    } catch (error: any) {
      console.error('Error fetching subscription info:', error);
      throw new Error('Failed to fetch subscription info');
    }
  }




  async localInitiateCharge(plan:PlanType, phone: string, amountExpected: number, teamId: string, userId: string, email: string) {
    const txRef = crypto.randomBytes(16).toString('hex');

    const data = {
      amount: amountExpected,
      tx_ref: txRef,
      currency: 'XAF',
      country: 'CM',
      email,
      phone_number: phone,
    };

    const headers = {
      Authorization: `Bearer FLWSECK_TEST-7772e1621ceb1eebc6e7b5134fc0b9f7-X`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios.post(
        'https://api.flutterwave.com/v3/charges?type=mobile_money_franco',
        data,
        { headers }
      );

      if (response.data.status !== 'success') {
        throw new Error('Failed to initiate charge request');
      }

      console.log('Charge initiated successfully:', response.data);


      await db.initiatePayment.create({
        data: {
          amountExpected:1000,
          currency: 'XAF',
          billingCycle: 'monthly',
          status: 'pending',
          plan:plan,
          teamId,
          userId,
          flutterwaveRef: txRef,
        },
      });

      return {
        message: 'Payment request sent successfully',
        success: true,
        data: {
          tx_ref: txRef,
          transactionId: response.data.data.id,
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          status: response.data.data.status,
        },
      };
    } catch (error: any) {
      console.error('Error initiating charge:', error.response?.data || error.message);
      throw new Error('Failed to initiate charge');
    }
  }

// async Paymentwebhook(payload: any) {
//     const { event, data } = payload;

//     if (event !== 'charge.completed' || !data?.tx_ref) {
//       return { success: false, message: 'Invalid event or missing tx_ref' };
//     }

//     const txRef = data.tx_ref;
//     const status = data.status;
//     const amount = data.amount;
//     const currency = data.currency;
//     const transactionId = data.id;

//     // Find the matching InitiatePayment
//     const initiatedPay = await db.initiatePayment.findUnique({
//       where: {
//         flutterwaveRef: txRef,
//       },
//     });

//     if (!initiatedPay) {
//       return { success: false, message: 'No matching payment found' };
//     }



//     if (status === 'successful') {

//       const subs = await db.subscription.findFirst({
//         where: {
//           teamId: initiatedPay.teamId,
//           status: 'active',
//         },
//       })



//       // Update InitiatePayment
//       await db.initiatePayment.update({
//         where: { id: initiatedPay.id },
//         data: {
//           status: 'completed',
//           transactionId: String(transactionId),
//           currency,
//           amountExpected: amount,
//         },
//       });

//       // Optionally: Activate subscription or update team
//       if (initiatedPay.subscriptionId) {
//         await db.subscription.update({
//           where: { id: initiatedPay.subscriptionId },
//           data: {
//             status: 'active',
//             startDate: new Date(),
//             endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
//           },
//         });
//       }

//       return {
//         success: true,
//         message: 'Payment successful and updated',
//         data: {
//           tx_ref: txRef,
//           transactionId,
//           amount,
//           currency,
//           status,
//         },
//       };
//     }

//     return {
//       success: false,
//       message: 'Payment was not successful',
//     };
//   }


async Paymentwebhook(payload: any) {
  const { event, data } = payload;

  if (event !== 'charge.completed' || !data?.tx_ref) {
    return { success: false, message: 'Invalid event or missing tx_ref' };
  }

  const txRef = data.tx_ref;
  const status = data.status;
  const amount = data.amount;
  const currency = data.currency;
  const transactionId = data.id;

  const initiatedPay = await db.initiatePayment.findUnique({
    where: {
      flutterwaveRef: txRef,
    },
  });

  if (!initiatedPay) {
    return { success: false, message: 'No matching payment found' };
  }

  if (status === 'successful') {
    const now = new Date();
    const billingCycle = initiatedPay.billingCycle || 'monthly';

    // Determine subscription duration
    let durationMs = 30 * 24 * 60 * 60 * 1000; // Default: 30 days
    if (billingCycle === 'yearly') {
      durationMs = 365 * 24 * 60 * 60 * 1000;
    }

    const endDate = new Date(now.getTime() + durationMs);

    // Update the initiatePayment record
    await db.initiatePayment.update({
      where: { id: initiatedPay.id },
      data: {
        status: 'completed',
        transactionId: String(transactionId),
        currency,
        amountExpected: amount,
      },
    });

    // Check if an active subscription exists
    const existingSubscription = await db.subscription.findFirst({
      where: {
        teamId: initiatedPay.teamId,
        status: 'active',
      },
    });

    if (!existingSubscription) {
      // Create new subscription
     await db.subscription.create({
  data: {
    teamId: initiatedPay.teamId,
    plan: initiatedPay.plan,
    interval: billingCycle, // <-- Add this line
    status: 'active',
    price: amount,
    currency,
    startDate: now,
    endDate,
  },
});

    } else {
      // Update existing one (optional: extend time or skip)
      await db.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          endDate, // Or optionally extend it instead of resetting
          startDate: now,
        },
      });
    }

    return {
      success: true,
      message: 'Payment successful and subscription updated/created',
      data: {
        tx_ref: txRef,
        transactionId,
        amount,
        currency,
        status,
      },
    };
  }

  return {
    success: false,
    message: 'Payment was not successful',
  };
}


  async verifyTransaction(
    transactionId: string,
    expectedAmount: number,
    expectedCurrency: string,
    userId: string,
    txRef: string
  ) {
    try {
      const response = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      if (
        response.data.status === 'success' &&
        response.data.data.tx_ref === txRef &&
        response.data.data.currency === expectedCurrency &&
        response.data.data.amount === expectedAmount
      ) {
        const initiatedPayment = await db.initiatePayment.findUnique({
          where: { flutterwaveRef: txRef },
        });

        if (!initiatedPayment) {
          throw new Error('Initiated payment not found in the database.');
        }

        const createdAt = new Date(initiatedPayment.createdAt);
        const currentTime = new Date();
        const timeDifference = (currentTime.getTime() - createdAt.getTime()) / 1000;

        if (timeDifference > 60) {
          await db.initiatePayment.update({
            where: { id: initiatedPayment.id },
            data: { status: 'failed' },
          });

          return {
            message: 'Transaction verification failed due to timeout.',
            success: true,
            data: {
              ...initiatedPayment,
            },
          };
        }

        return {
          message: 'Transaction Verified',
          success: true,
          data: {
            ...initiatedPayment,
          },
        };
      } else {
        throw new Error('Transaction verification failed or payment details do not match.');
      }
    } catch (error: any) {
      console.error('Error verifying transaction:', error.message);
      throw error;
    }
  }

  async CheckoutWithFlutter(userdata: { userId: string; email: string }, teamId: string) {
    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };

    const txRef = crypto.randomUUID().toString();

    try {
      const paymentRequest = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: txRef,
          amount: 9.99,
          currency: 'USD',
          redirect_url: 'https://notpadd-web.vercel.app/',
          customer: {
            email: userdata.email,
            name: 'Notpadd Payment',
          },
          customizations: {
            title: 'Notpadd Payment',
          },
        },

         {
      headers: {
        Authorization: `Bearer FLWSECK_TEST-7772e1621ceb1eebc6e7b5134fc0b9f7-X`,
        'Content-Type': 'application/json'
      }
    }
        
      );

      // console.log('Payment request response:', paymentRequest);
      // console.log("secret and public key", this.secretKey, this.publicKey);

      if (paymentRequest.status === 200) {
        await db.initiatePayment.create({
          data: {
            userId: userdata.userId,
            teamId,
            plan: 'Monthly',
            billingCycle: 'monthly',
            amountExpected: 9.99,
            currency: 'USD',
            status: 'pending',
            flutterwaveRef: txRef,
          },
        });
      }

      return {
        data: paymentRequest.data,
        status: true,
      };
    } catch (error: any) {
      console.error(error);
      return {
        status: false,
        data: "An error occurred while processing the payment request.",
      };
    }
  }

    async validateAndUpdateuserSubs() {
  try {
    const subscriptions = await db.subscription.findMany();

    const updates = [];

    for (const sub of subscriptions) {
      const duration = PLAN_DURATIONS[sub.plan];

      if (duration === undefined) {
        console.warn(`Unknown plan '${sub.plan}' for subscription ${sub.id}`);
        continue;
      }

      if (duration === Infinity) continue; // Free plan never expires

      const expiryDate = addDays(new Date(sub.startDate), duration);

      if (isAfter(new Date(), expiryDate) && sub.status === 'active') {
        updates.push(
          db.subscription.update({
            where: { id: sub.id },
            data: { status: 'inactive' },
          })
        );
      }
    }

    await Promise.all(updates);

    return {
      message: 'Subscription check complete.',
      totalChecked: subscriptions.length,
      expiredUpdated: updates.length,
    }
  } catch (error:any) {
    console.error('Error fixing subscriptions:', error);
    return {
      message: 'Internal server error',
      success: false,
      error: error.message,
      };
  }


}
}

export default new FlutterwaveService();



