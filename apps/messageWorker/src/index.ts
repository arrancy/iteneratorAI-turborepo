import { createClient } from "redis";
const groupName = "db_writers";
const streamKey = "messages";
import prisma from "@repo/db";
async function start() {
  try {
    const redisClient = createClient();
    await redisClient.connect();
    redisClient.on("error", (err) => {
      console.error("redis client error : " + err);
    });
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
      try {
        const staleEntries = await redisClient.xPendingRange(
          streamKey,
          groupName,
          "-",
          "+",
          2,
          { IDLE: 5000 },
        );
        if (staleEntries.length === 0)
          return console.log("found no stale entries");
        const staleIds = staleEntries.map((entry) => entry.id);
        const claimedEntries = await redisClient.xClaim(
          streamKey,
          groupName,
          "worker-1",
          5000,
          [...staleIds],
        );

        if (claimedEntries.length === 0) return;

        claimedEntries.forEach(async (entry) => {
          if (!entry) return;

          const streamId = entry.id;
          interface StreamPayload {
            msg_id: string;
            content: string;
            senderId: string;
            tripId: string;
          }
          const entryContent = entry.message as unknown as StreamPayload;
          const messageInDb = await prisma.message.create({
            data: {
              id: entryContent.msg_id,
              streamId,
              content: entryContent.content,
              senderId: entryContent.senderId,
              tripId: entryContent.tripId,
            },
          });
          if (messageInDb) {
            const messageAcked = await redisClient.xAck(
              streamKey,
              groupName,
              streamId,
            );

            return;
          }

          return;
        });
      } catch (error) {
        console.error(error);
        return;
      }
    }, 5000);

    while (true) {
      try {
        const message = await redisClient.xReadGroup(
          groupName,
          "worker-1",
          [{ key: streamKey, id: ">" }],
          { COUNT: 1, BLOCK: 5000 },
        );

        if (!message) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
      } catch (error) {
        console.error(error);
        continue;
      }
    }
  } catch (error) {
    console.error("initial redis connection failed : " + error);
    process.exit(1);
  }
}
start();
