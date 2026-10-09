import { notificationEmitter } from "@/lib/notificationEmitter/notificationEventEmitter";
import { createClient } from "redis";

export async function subscribeToPubSub() {
  try {
    const subscriber = createClient();
    subscriber.on("error", (err) => {
      console.error(err);
    });
    await subscriber.connect();
    subscriber.subscribe("paymentFullfilment", (message) => {
      try {
        const event: { userId: string; product: string } = JSON.parse(message);
        const userId = event.userId;
        const eventArgs = {
          type: "notification",
          purpose: "payment fulfillment",
          product: event.product,
        };
        notificationEmitter.emit(`user:${userId}`, eventArgs);
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}
