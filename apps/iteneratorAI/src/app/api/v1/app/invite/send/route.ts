import { requireAuth } from "@/utils/authUtils";
import { sendInviteSchema } from "@/zodTypes/sendInvite";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import prisma from "@repo/db";
export default async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id } = auth.details;
    const reqBody = await req.json();
    const { success } = sendInviteSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });
    const incomingData: z.infer<typeof sendInviteSchema> = reqBody;
    const validateTrip = await prisma.trip.findUnique({
      where: { id: incomingData.tripId },
    });
    if (!validateTrip)
      return NextResponse.json({ msg: "invalid trip id " }, { status: 400 });

    const { createdBy } = validateTrip;
    if (!(id === createdBy))
      return NextResponse.json(
        { msg: "you have no authority over this trip" },
        { status: 400 },
      );
    const inviteInDb = await prisma.invite.create({
      data: {
        tripId: validateTrip.id,
        invitedBy: validateTrip.createdBy,
        userInvited: incomingData.receiverUserId,
        status: "pending",
      },
    });
    if (!inviteInDb)
      return NextResponse.json(
        { msg: "could not save invite " },
        { status: 500 },
      );
    return NextResponse.json(
      { msg: "invite sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
