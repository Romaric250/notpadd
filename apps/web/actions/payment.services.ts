import axios from 'axios';
import crypto from 'crypto';
import { db, PlanType } from '@workspace/db';

class FlutterwaveService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
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
      Authorization: `Bearer ${this.secretKey}`,
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


      const amount = this.GetPriceforPlan(plan)

      await db.initiatePayment.create({
        data: {
          amountExpected:10,
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

  async Paymentwebhook(data: any) {
    const { txRef, status, amount } = data;

    const transaction = await db.initiatePayment.findUnique({
      where: { flutterwaveRef: txRef },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    await db.initiatePayment.update({
      where: { id: transaction.id },
      data: { status },
    });

    if (status === 'successful') {
      await db.subscription.create({
        data: {
          plan: 'Basic',
          price: amount,
          currency: transaction.currency,
          interval: 'monthly',
          status: 'active',
          teamId: transaction.teamId,
          startDate: new Date(),
        },
      });
    }

    return { message: 'Webhook handled successfully' };
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
          redirect_url: 'https://example_company.com/success',
          customer: {
            email: userdata.email,
            name: 'Notpadd Payment',
          },
          customizations: {
            title: 'Notpadd Payment',
          },
        },
        { headers }
      );

      if (paymentRequest.status === 200) {
        await db.initiatePayment.create({
          data: {
            userId: userdata.userId,
            teamId,
            plan: 'Basic',
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
        data: null,
      };
    }
  }



  async GetPriceforPlan(plan:PlanType){

    let amount = 0;


    if (plan === 'Free'){
      return amount = 0
    }
    if(plan === 'Basic'){
      return  amount = 10
    }
    if(plan === 'Premium'){
      return amount= 500
    }

    return 0

  }



}

export default new FlutterwaveService();
