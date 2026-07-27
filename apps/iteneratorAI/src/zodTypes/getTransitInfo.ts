import z from "zod";
import { getIteneraryBasicSchema } from "./getItenerary";
export const getTransitInfoSchema = z.object({
  getItineraryInput: getIteneraryBasicSchema,
  itinerary: z.string().min(1),
});

export const transitInfoLlmSchema = z.object({
  domesticTrip: z.boolean(),
  internationalTrip: z.boolean(),
  usesIndianRailways: z.object({
    applicable: z.boolean(),
    journeys: z.array(
      z.object({ source: z.string().min(1), destination: z.string().min(1) })
    ),
  }),
});
