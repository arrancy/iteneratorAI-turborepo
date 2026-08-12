import {
  notificationEmitter,
  NotificationEventArgs,
} from "@/lib/notificationEmitter/notificationEventEmitter";
import { requireAuth } from "@/utils/authUtils";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { id, name } = auth.details;
  const encoder = new TextEncoder();
  const sseStream = new ReadableStream({
    async start(controller) {
      console.log("stream has started");
      const eventName = `user:${id}`;
      const listener = (args: NotificationEventArgs) => {
        const eventString = `data: ${JSON.stringify(args)}\n\n`;
        controller.enqueue(encoder.encode(eventString));
      };
      notificationEmitter.on(eventName, listener);
      req.signal.addEventListener("abort", () => {
        notificationEmitter.off(eventName, listener);
      });
    },
  });
}
