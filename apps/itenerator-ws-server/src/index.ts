import { WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import { parse } from "cookie";
import "dotenv";
import type { JWT } from "next-auth/jwt";
import prisma from "@repo/db";
const wss = new WebSocketServer({ port: 8080 }, () =>
  console.log("websocket server started"),
);
interface customToken extends JWT {
  id: string;
}
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
  } else {
    socket.close(1002, " unauthenticated");
  }
});
