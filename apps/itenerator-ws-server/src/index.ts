import WebSocket, { WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import { parse } from "cookie";
import { createClient } from "redis";
import "dotenv";
import z from "zod";
import type { JWT } from "next-auth/jwt";
import prisma from "@repo/db";
import { wsMessageType } from "./zodTypes/zodTypes.js";
import { v7 as uuidv7 } from "uuid";
interface customToken extends JWT {
  id: string;
}
let redisClientConnected = false;
const rooms = new Map<string, Set<WebSocket>>();

async function start() {
  const redisClient = createClient();

  try {
    await redisClient.connect();
    redisClientConnected = true;
  } catch (error) {
    console.log(error);
  }
  const wss = new WebSocketServer({ port: 8080 }, () =>
    console.log("websocket server started"),
  );

  wss.on("connection", async (socket, req) => {
    console.log(req.headers.cookie);
    const cookies = parse(req.headers.cookie || "");
    const token = await getToken({
      req: { cookies, Headers: req.headers } as any,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    console.log("here");
    console.log(token);
    let tripMemberMap: Map<
      string,
      { id: string; userId: string; tripId: string }
    > | null = null;
    if (token) {
      const { id } = token as customToken;
      console.log("upgraded");
      const hasTrips = await prisma.tripMember.findMany({
        where: { userId: id },
      });
      if (!(hasTrips.length > 0)) {
        return socket.close(1002, "sorry! you do not have any trips ");
      }
      if (!redisClientConnected)
        return socket.close(1011, "sorry!,internal server error");

      hasTrips.forEach((trip) => {
        const { tripId } = trip;
        const roomSet = rooms.get(tripId);
        if (!roomSet) {
          const newSet = new Set<WebSocket>();
          newSet.add(socket);
          rooms.set(tripId, newSet);
          return;
        }
        const newRoomSet = roomSet.add(socket);
        rooms.set(tripId, newRoomSet);
        const tripMemberMapTemp = new Map(
          hasTrips.map((tripMember) => [tripMember.tripId, tripMember]),
        );
        tripMemberMap = tripMemberMapTemp;
        return;
      });

      socket.on("message", async (data) => {
        try {
          const dataJson = JSON.parse(String(data));
          const { success } = wsMessageType.safeParse(dataJson);
          if (!success) return socket.close(1002, "invalid inputs");
          const incomingData: z.infer<typeof wsMessageType> = dataJson;
          const { tripId, content, name } = incomingData;
          const activeRoom = rooms.get(tripId);
          if (!activeRoom) {
            return socket.close(1002, "invalid connection");
          }
          const currentSocketExists = activeRoom.has(socket);
          if (!currentSocketExists) {
            return socket.close(1001, "invlaid connection");
          }
          const currentMessageId = uuidv7();
          const messageAckObject = {
            type: "message-ack",
            name,
            msg_id: currentMessageId,
            content,

            userId: id,
          };
          if (activeRoom.size === 1) {
            if (!tripMemberMap) return socket.close(1002, "bad req");
            const tripMemberObject = tripMemberMap.get(tripId);
            if (!tripMemberObject) return socket.close(1002, "bad req");

            const streamElementId = await redisClient.xAdd("messages", "*", {
              tripId,
              senderId: tripMemberObject?.id,
              msg_id: currentMessageId,
              content,
            });
            socket.send(JSON.stringify(messageAckObject));
            return;
          }
          const streamElementId = await redisClient.xAdd("messages", "*", {
            tripId,
            senderId: id,
            msg_id: currentMessageId,

            content,
          });
          socket.send(JSON.stringify(messageAckObject));
          activeRoom.forEach((roomSocket) => {
            if (roomSocket === socket) return;
            roomSocket.send(
              JSON.stringify({ name, senderId: id, tripId, content }),
            );
          });
        } catch (error) {
          socket.close(1002, "invalid inputs");
        }
      });
      socket.send("connected");
    } else {
      socket.close(1002, " unauthenticated");
    }
  });
}
start();
