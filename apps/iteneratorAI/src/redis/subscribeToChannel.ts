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
        const event = JSON.parse(message);
        const userId = event.userId;
        notificationEmitter.emit(`userId:${userId}`);
      } catch (error) {
        console.error(error);
      }
    });
  } catch (error) {
    console.error(error);
  }
}
