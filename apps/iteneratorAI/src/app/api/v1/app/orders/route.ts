import { requireAuth } from "@/utils/authUtils";
import { orderSchema } from "@/zodTypes/orders";
import Razorpay from "razorpay";
import z from "zod";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@repo/db";
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id, name } = auth.details;
    const reqBody = await req.json();
    const { success } = orderSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });
    const incomingData: z.infer<typeof orderSchema> = reqBody;
    const { product } = incomingData;
    const razorpayOrder = await razorpay.orders.create({
      amount: product === "premium" ? 50000 : 60000,
      currency: "INR",
      receipt: "receipt-" + Date.now(),
      notes: { product },
    });

    if (!razorpayOrder || !razorpayOrder.id)
      return NextResponse.json(
        { msg: "payment servers down" },
        { status: 500 },
      );
    const orderInDb = await prisma.order.create({
      data: {
        razorpayOrderId: razorpayOrder.id,
        product,
        receipt: razorpayOrder.receipt!,
        userId: id,
      },
    });
    if (!orderInDb)
      return NextResponse.json(
        { msg: "internal server error" },
        { status: 500 },
      );
    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      dbOrderId: orderInDb.id,
    });
  } catch (error) {
    console.error("error at server : " + error);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
