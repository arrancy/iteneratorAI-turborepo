import { z } from "zod";

export const addNameSchema = z.object({
  name: z
    .string()
    .regex(
      /^\p{L}+(?:['’-]\p{L}+)*(?: \p{L}+(?:['’-]\p{L}+)*){0,2}$/u,
      "Enter a valid name (1–3 names, letters, apostrophes, and hyphens only).",
    ),
});
