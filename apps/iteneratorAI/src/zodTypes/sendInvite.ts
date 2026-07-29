import z from "zod";
const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/);

export const sendInviteSchema = z.object({
  receiverUserId: cuidSchema,
  tripId: cuidSchema,
});
