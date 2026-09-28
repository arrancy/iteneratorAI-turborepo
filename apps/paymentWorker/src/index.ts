import { createClient } from "redis";

async function start() {
  try {
    const streamKey = "paymentsToFulfill";
    const groupName = "paymentWorkers";
    const workerName = "paymentWorker-1";

    const redisClient = createClient();
    await redisClient.connect();
  } catch (error) {}
}
