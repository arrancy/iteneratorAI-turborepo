import z from "zod";

const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/);
export const wsMessageType = z.object({
  tripId: cuidSchema,
  name: z
    .string()
    .regex(
      /^\p{L}+(?:['’-]\p{L}+)*(?: \p{L}+(?:['’-]\p{L}+)*){0,2}$/u,
      "Enter a valid name (1–3 names, letters, apostrophes, and hyphens only).",
    ),
  type: z.enum(["message"]),
  content: z.string().min(1).max(10000),
});
//sample object
// const abc = {
//   tripId: "cmssoro6o00014fhuurvrpisq",
//   name: "RUTURAJ CHONDEKAR",
//   type: "message",
//   content: "hello there",
// };
