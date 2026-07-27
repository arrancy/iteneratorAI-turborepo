import z from "zod";

export const createTripSchema = z.object({
  name: z.string().min(1),
  destination: z.object({
    placeName: z.string(),
    country: z.string(),
    osm_key: z.enum(["place", "historic", "tourism"]),
    osm_id: z.number(),
    fromOrTo: z.enum(["to"]),
  }),
});
