import z from "zod";

const wsMessageType = z.object({
  type: z.enum(["message"]),
  content: z.string().min(1).max(10000),
});
