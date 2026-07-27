import { getTransitWaysSystemPrompt } from "@/lib/prompts/getTransitWaysSystemPrompt";
import { photonRequestFunction } from "@/utils/photonRequest";
import { getIteneraryBasicSchema } from "@/zodTypes/getItenerary";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";
import z from "zod";
import { tavily } from "@tavily/core";
import { authFunction, requireAuth } from "@/utils/authUtils";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function webSearch({ query }: { query: string }) {
  try {
    const result = await tavilyClient.search(query, { searchDepth: "basic" });
    const finalContentArray = result.results.map((item) => ({
      title: item.title,
      content: item.content,
    }));
    return finalContentArray;
  } catch (error) {
    if (error instanceof Error) console.log(error.message);
    return null;
  }
}
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    // req body schema for this will be get itenerary schema only and same logic to check if place is real
    const reqBody = await req.json();
    const { success } = getIteneraryBasicSchema.safeParse(reqBody);
    if (!success) {
      console.log("zod schema problem ");
      return NextResponse.json({ msg: "invalid inputs" }, { status: 403 });
    }
    type GetItetenerarySchemaType = z.infer<typeof getIteneraryBasicSchema>;

    const requestBody: GetItetenerarySchemaType = reqBody;
    const { name: fromPlaceName, ...remainingFromPlace } =
      requestBody.fromPlace;
    const fromPlaceObject: {
      fromOrTo: "from";
    } & {
      osm_id: number;
      osm_key: "place";
      country: string;
      placeName: string;
    } = {
      ...remainingFromPlace,
      fromOrTo: "from",
      placeName: fromPlaceName,
    };

    const isFromPlaceValid = await photonRequestFunction(fromPlaceObject);
    const { name: toPlaceName, ...toPlaceRemaining } = requestBody.toPlace;
    const toPlaceObject: { fromOrTo: "to" } & {
      country: string;
      osm_id: number;
      osm_key: "place" | "tourism" | "historic";
      placeName: string;
    } = { ...toPlaceRemaining, placeName: toPlaceName, fromOrTo: "to" };

    const isToPlaceValid = await photonRequestFunction(toPlaceObject);
    if (!isFromPlaceValid || !isToPlaceValid) {
      console.log("photon verification failed");
      return NextResponse.json({ msg: "invalid inputs" }, { status: 403 });
    }
    const userPromptObject = {
      fromPlace: {
        name: fromPlaceObject.placeName,
        country: fromPlaceObject.country,
      },
      toPlace: {
        name: toPlaceObject.placeName,
        country: toPlaceObject.country,
      },
    };
    const userPrompt = JSON.stringify(userPromptObject);
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: getTransitWaysSystemPrompt },
      { role: "user", content: userPrompt },
    ];
    const tools = [
      {
        type: "function",
        function: {
          name: "webSearch",
          description: "search the internet",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "the google/web search query to get the desired output. eg. 'all the ways to travel between munnar and kochi ' ",
              },
            },
          },
        },
      },
    ];
    const response = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      tools,
    });
    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;
    if (!toolCalls)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 403 });

    const functionName = toolCalls[0].function.name;
    if (functionName === "webSearch") {
      const functionArgs: { query: string } = JSON.parse(
        toolCalls[0].function.arguments,
      );
      const { query } = functionArgs;
      const searchResults = await webSearch({ query });
      if (!searchResults)
        return NextResponse.json(
          { msg: "an unknown error occured" },
          { status: 500 },
        );

      const toolCallMessage: ChatCompletionMessageParam = {
        role: "tool",
        tool_call_id: toolCalls[0].id,
        //eslint-disable-next-line
        //@ts-ignore
        name: toolCalls[0].function.name,
        content: String(searchResults),
      };
      messages.push(toolCallMessage);

      const finalResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
      });

      const finalResponseMessage = finalResponse.choices[0].message.content;
      return NextResponse.json({ msg: finalResponseMessage }, { status: 200 });
    }
  } catch (error) {
    if (error instanceof Error) console.log(error.message);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
