import { db } from "@workspace/db";
import { currentUser } from "@clerk/nextjs/server";

import { NextResponse } from "next/server";
import axios from "axios";


export async function POST(req:Request, {params}:{params:{templateId:string}}){
    try {

        const {templateId} = params

        if (!templateId){
            return new NextResponse("templateId is required", {status:400})
        }

        const activeuser = await currentUser()

        if (!activeuser){
            return new NextResponse("user not found", {status:404})
        }

        const user = await db.user.findUnique({
            where:{
                clerkId:activeuser.id 
            }
        })

        if (!user){
            return new NextResponse("user not found in our database", {status:404})
        }


        const template = await db.template.findUnique({
            where:{
                id:templateId
            }
        })

        if (!template){
            return new NextResponse("template not found", {status:404})
        }


        const paymentrequest = await CheckoutWithFlutter( {userId:user.id ,email:user.email}, template.id)

        if (!paymentrequest){
            return new NextResponse("An error occured while processing the payment", {status:500})
        }
        if (paymentrequest.status === 'success'){

            return new NextResponse(JSON.stringify(paymentrequest), {status:200})

        }


    } catch (error:any) {
        return NextResponse.json({error:error.message}, {status:500})
    }

}




async function CheckoutWithFlutter(userdata:{userId:string,email:string }, templateId:string){


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
        email: 'pro.ground@gmail.com',
        name: 'Pro Ground',
        phonenumber: '09012345678'
      },
      customizations: {
        title: 'Template Payment',
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
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

        if (!createinitiatedpayement){
            return new NextResponse("An error occured while processing the payment", { status: 500 })
        }

    return paymentrequest.data
        
       }
    }
    

    catch (error: any){
        console.log(error)


    }


}








// export async function POST(req: Request) {


//     const headers = {
//         Authorization: `Bearer ${process.env.SECRET_KEY}`,
//         "Content-Type": "application/json"
//     }

//     const {currentuserId,phone_number, } = await req.json()



//     const txt_refs = crypto.randomUUID().toString()
//     // console.log("txt_ref", txt_refs,currentuserId)

//     const doesuserexist = await db.user.findUnique({
//         where: {
//             id: currentuserId
//         }
//     })

//     if (!doesuserexist) {
//         return new NextResponse("Use does not exist, not authorized to make payment here", { status: 400 })
//     }




//     // generate the txt-ref and send to the user, then make the payement request and check 
//     //then check if the payment was successful and update the user subscription status
//     // then send a response to the user the pushed the payment request, if the payment was 



//     const data = {
//         amount: 5,
//         email: doesuserexist.email,
//         id: "59403jt",
//         tx_ref: txt_refs,
//         currency: "XAF",
//         country: "CM",
//         customertoken: "dfgdfgd",
//         fullname: doesuserexist.id,
//         phone_number: phone_number,
//         redirect_url: "https://www.google.com", //this should be the url to redirect to after payment
//     }
//     try {

//         const paymentrequest = await axios.post("https://api.flutterwave.com/v3/charges?type=mobile_money_franco", data, {
//             headers: headers
//         })

//         return new NextResponse(JSON.stringify(paymentrequest.data), { status: 200 })


//     } catch (error: any) {
//         console.log(error)
//         return new NextResponse("An error occured while processing the payment", { status: 500 })

//     }

// }






// checkout testing 

