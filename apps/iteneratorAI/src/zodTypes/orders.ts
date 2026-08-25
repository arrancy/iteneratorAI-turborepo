import z from "zod";

export const orderSchema = z.object({ product: z.enum(["premium", "pro"]) });
