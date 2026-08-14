import z from "zod";
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/);

export const sendInviteSchema = z.object({
  receiverUserId: cuidSchema,
  tripId: cuidSchema,
});
