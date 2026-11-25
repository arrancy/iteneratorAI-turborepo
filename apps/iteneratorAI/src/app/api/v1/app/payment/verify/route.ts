import { requireAuth } from "@/utils/authUtils";
import { verifySchema } from "@/zodTypes/verify";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@repo/db";
import z from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import "dotenv";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id } = auth.details;

    const reqBody = await req.json();
    const { success } = verifySchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 401 });

    const incomingData: z.infer<typeof verifySchema> = reqBody;

    const { razorpay_order_id } = incomingData;
    const orderExists = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id, userId: id },
    });

    if (!orderExists)
      return NextResponse.json({ msg: "invalid data" }, { status: 401 });
    function verifySignature(
      razorpayOrderId: string,
      razorpayPaymentId: string,
      receivedSignature: string,
      keySecret: string,
    ) {
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");
      return timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(receivedSignature, "hex"),
      );
    }
    const isValid = verifySignature(
      orderExists.razorpayOrderId,
      incomingData.razorpay_payment_id,
      incomingData.razorpay_signature,
      process.env.RAZORPAY_SECRET!,
    );

    if (!isValid)
      return NextResponse.json({ msg: "payment invalid" }, { status: 401 });

    return NextResponse.json({ msg: "payment valid " }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
