import z from "zod";
import { cuidSchema } from "./sendInvite";

export const acceptInviteSchema = z.object({ inviteId: cuidSchema });
