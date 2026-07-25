import z from "zod";

const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/);
export const wsMessageType = z.object({
  tripId: cuidSchema,
  type: z.enum(["message"]),
  content: z.string().min(1).max(10000),
});
