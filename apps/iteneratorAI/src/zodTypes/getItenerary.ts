import z from "zod";
export const getIteneraryBasicSchema = z.object({
  fromPlace: z.object({
    name: z.string().min(1),
    country: z.string().min(1),
    osm_key: z.enum(["place"]),
    osm_id: z.number(),
  }),
  toPlace: z.object({
    name: z.string().min(1),
    country: z.string().min(1),

    osm_key: z.enum(["place", "historic", "tourism"]),
    osm_id: z.number(),
  }),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

export const getItenerarySchema = getIteneraryBasicSchema.extend({
  mood: z
    .array(
      z.enum([
        "relaxed",
        "adventurous",
        "mainstream",
        "underrated",
        "exploratory",
      ])
    )
    .min(1)
    .max(3),
  budget: z.enum(["backpacking", "conservative", "decent", "good"]),
  numberOfPeople: z.number().min(1).max(10),
});

// so we can take the display name for sure , on top of that we can also take class, class can be place, tourism , or historic that's it, and we can add in the system prompt that
// if the class is historic or tourism then we can suggest the LLM in the prompt that you can add keep visiting that place at the top priority
// and if the duration allows then include other things nearby that place in the itinerary
// now that i have discovered even the most legit display_names return multiple results, i am sure  we need to query by placeid after getting the response
// on top of all this we need to learn rate limiting so that we don't end up being DDOSed and increase our bills by calling that location
// api many times
// locationiq not happening, photon very similar, search by id not happening, max we can do is search , basically the same ,
