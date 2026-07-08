import { WebSocketServer } from "ws";
import { getToken } from "next-auth/jwt";
import prisma from "@repo/db";
const wss = new WebSocketServer({ port: 8080 }, () => console.log("websocket server started"));
wss.on("connection", (socket) => {
    socket.on("upgrade", async (req) => {
        const token = await getToken({ req: { headers: req.headers } });
        if (token) {
            const { id } = token;
            const hasTrips = await prisma.user.findFirst({ where: { id } });
        }
        else {
            socket.close();
        }
    });
});
