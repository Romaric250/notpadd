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

// local transaction data

// Webhook data received: {
//   event: 'charge.completed',
//   data: {
//     id: 9396012,
//     tx_ref: 'feab2181110b899bca3d7d748c51eefa',
//     flw_ref: 'FLWTK43726MCK1748695213043',
//     device_fingerprint: 'N/A',
//     amount: 1000,
//     currency: 'XAF',
//     charged_amount: 1000,
//     app_fee: 20,
//     merchant_fee: 0,
//     processor_response: 'Transaction Successful',
//     auth_model: 'AUTH',
//     ip: '54.75.161.64',
//     narration: 'Romaric Lonfonyuy 1720517403039',
//     status: 'successful',
//     payment_type: 'mobilemoneysn',
//     created_at: '2025-05-31T12:40:12.000Z',
//     account_id: 2508541,
//     customer: {
//       id: 3304114,
//       name: 'Romaric Lonfonyuy 1720517403039',
//       phone_number: '237650650516',
//       email: 'ravesb_333b1e91da8be57d5cdf_lonfonyuyromaric@gmail.com',
//       created_at: '2025-05-31T12:31:29.000Z'
//     }
//   },
//   'event.type': 'MOBILEMONEYSN_TRANSACTION'
// }


// card transaction data 

// Webhook data received: {
//   event: 'charge.completed',
//   data: {
//     id: 9396013,
//     tx_ref: 'fcfd6046-d8db-4c3c-948d-ae3437fced1d',
//     flw_ref: 'FLW-MOCK-53627b07b394a5a8dd69279d6fb45934',
//     device_fingerprint: 'N/A',
//     amount: 9.99,
//     currency: 'USD',
//     charged_amount: 9.99,
//     app_fee: 0.38,
//     merchant_fee: 0,
//     processor_response: 'Approved. Successful',
//     auth_model: 'VBVSECURECODE',
//     ip: '52.209.154.143',
//     narration: 'CARD Transaction ',
//     status: 'successful',
//     payment_type: 'card',
//     created_at: '2025-05-31T12:42:59.000Z',
//     account_id: 2508541,
//     customer: {
//       id: 3304121,
//       name: 'Romaric Lonfonyuy 1720517403039',
//       phone_number: null,
//       email: 'ravesb_333b1e91da8be57d5cdf_lonfonyuyromaric@gmail.com',
//       created_at: '2025-05-31T12:42:59.000Z'
//     },
//     card: {
//       first_6digits: '553188',
//       last_4digits: '2950',
//       issuer: 'MASTERCARD  CREDIT',
//       country: 'NG',
//       type: 'MASTERCARD',
//       expiry: '09/32'
//     }
//   },
//   'event.type': 'CARD_TRANSACTION'
// }
