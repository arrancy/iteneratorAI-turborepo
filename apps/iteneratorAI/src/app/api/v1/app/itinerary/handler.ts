import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getItenerarySchema } from "@/zodTypes/getItenerary";
import { getItinerarySystemPrompt } from "@/lib/prompts/getItinerarySystemPrompt";
import prisma from "@repo/db";

import z from "zod";
import { photonRequestFunction } from "@/utils/photonRequest";
import { popularIndiaDestinations } from "@/lib/data/popularIndiaDestinations";
import supabase from "@/lib/db/supabaseSingleton";
export const aiResponseHandler = async (req: NextRequest, userId: string) => {
  const reqBody = await req.json();
  type ReqBodyType = z.infer<typeof getItenerarySchema>;
  const { success, error } = getItenerarySchema.safeParse(reqBody);
  if (!success)
    return NextResponse.json(
      { msg: "invalid inputss", errorMessage: String(error.message) },
      { status: 403 },
    );
  const userObject = reqBody as ReqBodyType;
  const fromPlaceObject: {
    fromOrTo: "from";
    placeName: string;
    osm_key: "place";
    country: string;
    osm_id: number;
  } = {
    fromOrTo: "from",
    placeName: userObject.fromPlace.name,
    country: userObject.fromPlace.country,
    osm_key: "place",
    osm_id: userObject.fromPlace.osm_id,
  };

  const toPlaceObject: {
    fromOrTo: "to";
    placeName: string;
    country: string;
    osm_key: "place" | "historic" | "tourism";
    osm_id: number;
  } = {
    fromOrTo: "to",
    placeName: userObject.toPlace.name,
    country: userObject.toPlace.country,
    osm_key: userObject.toPlace.osm_key,
    osm_id: userObject.toPlace.osm_id,
  };

  const isFromPlaceValid = await photonRequestFunction(fromPlaceObject);
  const isToPlaceValid = await photonRequestFunction(toPlaceObject);
  if (!isFromPlaceValid || !isToPlaceValid)
    return NextResponse.json({ msg: "invalid inputs 2" }, { status: 401 });

  const ai = new GoogleGenAI({});
  const ragAvailable = { status: false, text: "" };

  if (popularIndiaDestinations.includes(userObject.toPlace.name)) {
    // for RAG
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: userObject.toPlace.name,
    });
    if (!response || !response.embeddings) {
      return NextResponse.json({ msg: "could not produce embeddings " });
    }

    const embeddings = response.embeddings[0].values;
    if (!embeddings)
      return NextResponse.json(
        { msg: "internal server error" },
        { status: 500 },
      );
    const { data, error } = await supabase.rpc("match_travel_embeddings", {
      query_embedding: embeddings,
      match_count: 3,
    });
    if (error)
      return NextResponse.json(
        {
          msg: "internal server error of supabase rpc : ",
          error,
        },
        { status: 500 },
      );

    const requiredText: string = data[0].content;
    if (requiredText) {
      ragAvailable.status = true;
      ragAvailable.text = requiredText;
    }
  }
  const tokenResponse = await ai.models.countTokens({
    model: "gemini-2.5-flash",
    // Put system instruction as a content item with role 'system'

    contents: [
      {
        role: "system",

        parts: [
          {
            text: getItinerarySystemPrompt,
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify(userObject),
          },
        ],
      },
    ],
  });
  console.log(tokenResponse);
  let finalItenerary = "";
  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",

    config: {
      thinkingConfig: { thinkingBudget: 0 },
      tools: [{ googleSearch: {} }],
      systemInstruction:
        getItinerarySystemPrompt +
        (ragAvailable.status
          ? `\n\n here is some extra special context provided by our places database about the place the user has asked about, make sure to include this in your itenerary  : \n${ragAvailable.text}`
          : ""),
    },

    contents: JSON.stringify(userObject),
  });
  const encoder = new TextEncoder();
  function responseToStream() {
    return new ReadableStream({
      async pull(controller) {
        const { done, value } = await response.next();
        if (done) {
          const iteneraryInDb = await prisma?.itenerary.create({
            data: {
              text: finalItenerary,
              userId,
              source:
                fromPlaceObject.placeName + ", " + fromPlaceObject.country,
              destination:
                toPlaceObject.placeName + ", " + toPlaceObject.country,
              headCount: userObject.numberOfPeople,
            },
          });
          if (!iteneraryInDb)
            throw new Error("could not save itenerary in DB ");
          controller.close();
          return;
        }
        finalItenerary += value.text;
        controller.enqueue(encoder.encode(value.text));
      },
    });
  }
  const responseStream = responseToStream();

  return new Response(responseStream);
};
