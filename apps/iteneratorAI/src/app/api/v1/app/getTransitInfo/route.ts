import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import {
  getTransitInfoSchema,
  transitInfoLlmSchema,
} from "@/zodTypes/getTransitInfo";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import Groq from "groq-sdk";
import { getTransitInfoSystemPrompt } from "@/lib/prompts/getTransitInfoSystemPrompt";
import { authFunction, requireAuth } from "@/utils/authUtils";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const reqBody = await req.json();
    const { success } = getTransitInfoSchema.safeParse(reqBody);
    type ReqBody = z.infer<typeof getTransitInfoSchema>;
    const requestBody: ReqBody = reqBody;
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: getTransitInfoSystemPrompt },
        { role: "user", content: JSON.stringify(reqBody) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "transit-info-llm-schema",

          schema: z.toJSONSchema(transitInfoLlmSchema),
        },
      },
      model: "openai/gpt-oss-20b",
    });

    const rawResult = JSON.parse(response.choices[0].message.content || "{}");
    const validatedResult = transitInfoLlmSchema.safeParse(rawResult);

    if (validatedResult.success) {
      const finalResult = validatedResult.data;
      const airBnbUrl = `https://www.airbnb.co.in/${requestBody.getItineraryInput.toPlace.name}-${requestBody.getItineraryInput.toPlace.country}/stays`;
      if (
        finalResult.usesIndianRailways.applicable &&
        finalResult.usesIndianRailways.journeys.length >= 0
      ) {
        const generateRedRailUrl = (source: string, destination: string) =>
          `https://www.redbus.in/railways/search?src=${source}&dst=${destination}&doj=20260117&srcName=${source}&dstName=${destination}%20-%20All%20Stations&fcOpted=false`;

        const redRailUrls = finalResult.usesIndianRailways.journeys.map(
          (journey) => generateRedRailUrl(journey.source, journey.destination),
        );
        return NextResponse.json(
          { result: finalResult, redRailUrls, airBnbUrl },
          { status: 200 },
        );
      }

      if (!finalResult.usesIndianRailways.applicable) {
        return NextResponse.json(
          { result: finalResult, airBnbUrl },
          { status: 200 },
        );
      }

      if (
        finalResult.usesIndianRailways.applicable &&
        finalResult.usesIndianRailways.journeys.length === 0
      ) {
        const { domesticTrip, internationalTrip } = finalResult;
        return NextResponse.json({
          domesticTrip,
          internationalTrip,
          airBnbUrl,
        });
      }
    } else {
      return NextResponse.json(
        { msg: "internal server error" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
