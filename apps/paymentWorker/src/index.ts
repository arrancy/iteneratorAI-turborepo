import { createClient } from "redis";
import prisma from "@repo/db";
async function start() {
  try {
    const streamKey = "paymentsToFulfill";
    const groupName = "paymentWorkers";
    const workerName = "paymentWorker-1";

    const redisClient = createClient();
    try {
      redisClient.on("error", (error) => {
        console.error("redis error occured : ");
      });
      await redisClient.connect();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }

    try {
      const group = await redisClient.xGroupCreate(streamKey, groupName, "0", {
        MKSTREAM: true,
      });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("BUSYGROUP"))) {
        console.error(error);
      }
    }

    setInterval(async () => {
      const staleEntries = await redisClient.xPendingRange(
        streamKey,
        groupName,
        "-",
        "+",
        2,
        { IDLE: 2500 },
      );
      if (staleEntries.length === 0) return;
      const staleIds = staleEntries.map((entry) => entry.id);
      staleIds.forEach(async (staleId) => {
        const claimedEntry = await redisClient.xClaim(
          streamKey,
          groupName,
          workerName,
          2500,
          [staleId],
        );

        if (claimedEntry.length === 0) return;
        const claimedEntryContents = claimedEntry[0];
        if (!claimedEntryContents) return;
        interface PaymentStreamItem {
          razorpayOrderId: string;
          razorpayPaymentId: string;
          paymentFulfillmentId: string;
          userId: string;
        }
        const paymentData =
          claimedEntryContents.message as unknown as PaymentStreamItem;

        const paymentProcessingTransaction = await prisma.$transaction(
          async (tx) => {
            const fullPaymentObject = await tx.payment.findUnique({
              where: { razorpayPaymentId: paymentData.razorpayPaymentId },
              include: {
                paymentFulfillment: true,
                order: { include: { user: true } },
              },
            });
            if (!fullPaymentObject?.paymentFulfillment) return;
            const isPaymentFulfilled =
              fullPaymentObject.paymentFulfillment.fulfilled;
            if (isPaymentFulfilled) return;

            const { product, userId } = fullPaymentObject.order;
            const currentExpiry = fullPaymentObject.order.user.productExpiry;
            if (!userId || !currentExpiry) return;

            const newExpiryDate = new Date(currentExpiry);
            newExpiryDate.setDate(currentExpiry.getDate() + 30);
            const userMarkedPaid = tx.user.update({
              where: { id: userId },
              data: {
                paidUser: true,
                product,
                productExpiry: newExpiryDate,
              },
            });
            const paymentFulfilled = await tx.paymentFulfillment.update({
              where: { id: fullPaymentObject.paymentFulfillment.id },
              data: { fulfilled: true },
            });

            if (!paymentFulfilled) return;
            const messageAcked = await redisClient.xAck(
              streamKey,
              groupName,
              claimedEntryContents.id,
            );
          },
        );
      });
    }, 2500);
  } catch (error) {
    console.error("an error occured");
  }
}
