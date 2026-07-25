import WebSocket, { WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import { parse } from "cookie";
import { createClient } from "redis";
import "dotenv";
import z from "zod";
import type { JWT } from "next-auth/jwt";
import prisma from "@repo/db";
import { wsMessageType } from "./zodTypes/zodTypes.js";
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
        return;
      });

      socket.on("message", async (data) => {
        try {
          const dataJson = JSON.parse(String(data));
          const { success } = wsMessageType.safeParse(dataJson);
          if (!success) return socket.close(1002, "invalid inputs");
          const incomingData: z.infer<typeof wsMessageType> = dataJson;
          const { tripId, content } = incomingData;
          const activeRoom = rooms.get(tripId);
          if (!activeRoom) {
            return socket.close(1002, "invalid connection");
          }
          const currentSocketExists = activeRoom.has(socket);
          if (!currentSocketExists) {
            return socket.close(1001, "invlaid connection");
          }
          if (activeRoom.size === 1) {
            const streamId = await redisClient.xAdd("messages", "*", {
              tripId,
              senderId: id,
              content,
            });
            return;
          }
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
