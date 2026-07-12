import { WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import { parse } from "cookie";
import { createClient } from "redis";
import "dotenv";
import type { JWT } from "next-auth/jwt";
import prisma from "@repo/db";
interface customToken extends JWT {
  id: string;
}
let redisClientConnected = false;

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
      const hasTrips = await prisma.tripMember.findFirst({
        where: { userId: id },
      });
      if (!hasTrips) {
        socket.close(1002, "sorry! you do not have any trips ");
      }
      if (!redisClientConnected)
        socket.close(1011, "sorry!,internal server error");
    } else {
      socket.close(1002, " unauthenticated");
    }
  });
}
start();
