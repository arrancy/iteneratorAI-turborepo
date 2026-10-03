import { createClient } from "redis";
import prisma from "@repo/db";
const streamKey = "paymentsToFulfill";
const groupName = "paymentWorkers";
const workerName = "paymentWorker-1";
interface PaymentStreamItem {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paymentFulfillmentId: string;
  userId: string;
}
async function start() {
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
  async function checkPending() {
    try {
      while (true) {
        await new Promise((r) => setTimeout(r, 2500));

        try {
          const staleEntries = await redisClient.xPendingRange(
            streamKey,
            groupName,
            "-",
            "+",
            1,
            { IDLE: 15000 },
          );
          if (staleEntries.length === 0) continue;
          const staleId = staleEntries[0];
          if (!staleId) continue;
          const claimedEntry = await redisClient.xClaim(
            streamKey,
            groupName,
            workerName,
            15000,
            [staleId.id],
          );

          if (claimedEntry.length === 0) continue;
          const claimedEntryContents = claimedEntry[0];
          if (!claimedEntryContents) continue;

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
              if (isPaymentFulfilled) {
                const messageAcked = await redisClient.xAck(
                  streamKey,
                  groupName,
                  claimedEntryContents.id,
                );
                return;
              }

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
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.error("an error occured");
    }
  }

  checkPending();

  while (true) {
    try {
      const paymentsToProcess = await redisClient.xReadGroup(
        groupName,
        workerName,
        [{ key: streamKey, id: ">" }],
        { COUNT: 1, BLOCK: 2000 },
      );
      if (!paymentsToProcess || paymentsToProcess.length === 0) {
        console.log("no new payments to process");
        continue;
      }

      const streamPaymentObject: {
        id: string;
        message: PaymentStreamItem;
      } = paymentsToProcess[0]?.messages[0];

      if (!streamPaymentObject) continue;

      const processingTransaction = await prisma.$transaction(async (tx) => {
        const dbFullPaymentObject = await tx.payment.findUnique({
          where: { id: streamPaymentObject.message.razorpayPaymentId },
          include: {
            paymentFulfillment: true,
            order: { include: { user: true } },
          },
        });
      });
    } catch (error) {}
  }
}
