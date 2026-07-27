import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { photonRequestFunction } from "@/utils/photonRequest";
import { createTripSchema } from "@/zodTypes/createTrip";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@repo/db";
import z from "zod";
import { authFunction, requireAuth } from "@/utils/authUtils";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { id } = auth.details;

    const reqBody = await req.json();
    const { success } = createTripSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 403 });
    const userObject = reqBody as z.infer<typeof createTripSchema>;

    const { destination } = userObject;
    const { placeName, osm_id, osm_key, fromOrTo, country } = destination;

    const validationParams = { placeName, osm_id, osm_key, fromOrTo };
    const response = await photonRequestFunction(validationParams);
    if (!response)
      return NextResponse.json(
        { msg: "invalid inputs photon" },
        { status: 403 },
      );

    const tripInDatabase = await prisma.trip.create({
      data: {
        name: userObject.name,
        createdBy: id,
        destination: placeName + ", " + country,
        members: { create: { userId: id } },
      },
    });

    if (!tripInDatabase)
      return NextResponse.json(
        { msg: "internal server error" },
        { status: 500 },
      );

    return NextResponse.json({ msg: "trip created successfully" });
  } catch (error) {
    console.log(error);
  }
}
