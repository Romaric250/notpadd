
import axios from 'axios';
import crypto from 'crypto';
import { db } from '@workspace/db';


class FlutterwaveService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || '';
  }

  async localInitiateCharge(phone: string, amount: number, userId: string, email: string) {
    const txRef = crypto.randomBytes(16).toString('hex');

    const data = {
      amount,
      tx_ref: txRef,
      currency: 'XAF',
      country: 'CM',
      email: email,
      phone_number: phone
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

      // Save the transaction in the database
      await db.initiatePayment.create({
        data: {
          txRef,
          amount,
          status: 'pending',
          userId,
        },
      });

      return {
        message: 'Payment request sent successfully',
        success:true,
        data:{
          tx_ref: txRef,
          transactionId:response.data.data.id,
          amount: response.data.data.amount,
          currency: response.data.data.currency,
          status:response.data.data.status
        }
        
      };
    } catch (error: any) {
      console.error('Error initiating charge:', error.response?.data || error.message);
      throw new Error('Failed to initiate charge');
    }
  }

  async Paymentwebhook(data: any) {
    const { txRef, status, amount } = data;

    // Verify the transaction
    const transaction = await db.initiatePayment.findUnique({
      where: { txRef },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Update the transaction status
    await db.initiatePayment.update({
      where: { txRef },
      data: { status },
    });

    if (status === 'successful') {
      // Handle successful transaction
      await db.subscriptions.create({
        data: {
          tx_ref: txRef,
          amountpaid: amount,
          userId: transaction.userId,
          lastpaymentdate: new Date(),
          nextpaymentdate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          paidcurrentmonth: true,
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
    txt_ref: string
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
  
      console.log("response:", response.data.status, response.data.data.amount);
  
      if (
        response.data.status === 'success' &&
        response.data.data.tx_ref === txt_ref &&
        response.data.data.currency === expectedCurrency &&
        response.data.data.amount === expectedAmount
      ) {
        const initiatedPayment = await db.initiatePayment.findUnique({
          where: {
            txRef: response.data.data.tx_ref,
            userId: userId,
          },
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
            message: "Transaction verification failed due to timeout.",
            success: true,
            data: {
              transactionId: response.data.data.id,
             ...initiatedPayment,
            },
          };
        }
  
        return {
          message: "Transaction Verified",
          success: true,
          data: {
            transactionId: response.data.data.id,
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

  async CheckoutWithFlutter(userdata:{userId:string,email:string }, templateId:string){


    const headers = {
        Authorization: `Bearer ${process.env.SECRET_KEY}`,
        "Content-Type": "application/json"
    }

    const txt_refs = crypto.randomUUID().toString()

    try {


         const paymentrequest = await axios.post(
    'https://api.flutterwave.com/v3/payments',
    {
      tx_ref: txt_refs,
      amount: 29,
      currency: 'AUD',
      redirect_url: 'https://example_company.com/success',
      customer: {
        email: 'skaleway@gmail.com',
        name: 'Notpadd Payment',
        phonenumber: '09012345678'
      },
      customizations: {
        title: 'Notpadd Payment',
      }
    },
    {
      headers:headers
    }
  );
   
       if (paymentrequest.status === 200){
        const createinitiatedpayement = await db.initiatedRequest.create({
            data:{
                userId:userdata.userId,
                templateId:templateId,
                txt_ref:txt_refs,

            }
        })

        
       }

  return {
          data:paymentrequest,
          status:false
        
        }
       
    }

    catch (error: any){
        console.log(error)
        return {
          status:false,
          data: null
        }


    }


}







  
}

export default new FlutterwaveService();
