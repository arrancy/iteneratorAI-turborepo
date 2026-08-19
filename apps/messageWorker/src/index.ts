import { createClient, RedisClient } from "redis";
const groupName = "db_writers";
const streamKey = "messages";
async function start() {
  try {
    const redisClient = createClient();
    await redisClient.connect();
    try {
      const group = await redisClient.xGroupCreate(streamKey, groupName, "0", {
        MKSTREAM: true,
      });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("BUSYGROUP"))) {
        console.error(error);
      }
    }
    while (true) {
      const message = await redisClient.xReadGroup(
        groupName,
        "worker-1",
        [{ key: streamKey, id: ">" }],
        { COUNT: 1, BLOCK: 5000 },
      );
    }
  } catch (error) {
    console.error(error);
  }
}
