import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import prisma, { Prisma } from "@repo/db";
import { createClient } from "redis";
export async function POST(req: NextRequest) {
  try {
    const reqBody = await req.text();
    const secret = process.env.RAZORPAY_SECRET!;
    const headerList = await headers();
    const signatureHeader = headerList.get("X-Razorpay-Signature");
    if (!signatureHeader)
      return NextResponse.json({ msg: "header not found " }, { status: 400 });
    const expectedSignature = validateWebhookSignature(
      reqBody,
      signatureHeader,
      secret,
    );
    if (expectedSignature) {
      let redisClientConnected = false;
      const redisClient = createClient();
      await redisClient.connect();
      redisClientConnected = true;
      if (redisClientConnected) {
        const incomingData = JSON.parse(reqBody);
        const eventId = headerList.get("x-razorpay-event-id");
        if (!eventId)
          return NextResponse.json(
            { msg: "invalid request " },
            { status: 400 },
          );
        const paymentStatus = incomingData.payload.payment.status;
        if (paymentStatus === "authorized") {
          return NextResponse.json({ msg: "alright" }, { status: 200 });
        }
        const razorpayPaymentId = incomingData.payload.payment.id;
        const amount = incomingData.payload.payment.amount;
        const currency = incomingData.payload.payment.currency;
        const razorpayOrderId = incomingData.payload.payment.order_id;
        const transactionStatus = await prisma.$transaction(async (tx) => {
          const webhookEventInDb = await tx.webhookEvents.create({
            data: {
              razorpayPaymentId,
              paymentStatus,
              amount,
              currency,
              eventId,
            },
          });
          const paymentExists = await tx.payment.findUnique({
            where: { razorpayPaymentId },
          });

          if (!paymentExists) {
            if (paymentStatus === "captured") {
              const paymentInDb = await tx.payment.create({
                data: {
                  amount,
                  currency,
                  razorpayPaymentId,
                  razorpayOrderId,
                  status: paymentStatus,
                  paymentFulfillment: {
                    create: {
                      fulfilled: false,
                    },
                  },
                },
              });
              return;
            } else {
              const paymentInDb = await tx.payment.create({
                data: {
                  amount,
                  currency,
                  razorpayPaymentId,
                  razorpayOrderId,
                  status: paymentStatus,
                },
              });
              return;
            }
          }

          if (paymentExists.status === "captured") {
            return;
          }

          if (paymentStatus === "captured") {
            const updatedPayment = await tx.payment.update({
              where: { razorpayPaymentId },
              data: {
                status: "captured",
                paymentFulfillment: { create: { fulfilled: false } },
              },
            });
            return;
          }
          return;
        });

        return NextResponse.json({ msg: "alright" }, { status: 200 });
      } else {
        return NextResponse.json(
          { msg: "internal server error" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json({ msg: "bad req" }, { status: 400 });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { msg: "webhook already processed" },
        { status: 200 },
      );
    }
    console.error(error);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
