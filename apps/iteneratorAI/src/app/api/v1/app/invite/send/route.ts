import { requireAuth } from "@/utils/authUtils";
import { sendInviteSchema } from "@/zodTypes/sendInvite";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import prisma from "@repo/db";
import {
  notificationEmitter,
  NotificationEventArgs,
  NotificationPurpose,
} from "@/lib/notificationEmitter/notificationEventEmitter";
export async function POST(req: NextRequest) {
  try {
    console.log("reached req");
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id, name } = auth.details;
    const reqBody = await req.json();
    const { success } = sendInviteSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });
    const incomingData: z.infer<typeof sendInviteSchema> = reqBody;
    const validateTrip = await prisma.trip.findUnique({
      where: { id: incomingData.tripId },
      include: { creator: true },
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
    // tripId
    // we want the name of the receiver
    // we want the destination of the trip
    const eventInputs: NotificationEventArgs = {
      type: "notification",
      purpose: NotificationPurpose.sent,
      actingUserId: id,
      inviteId: inviteInDb.id,
      tripId: validateTrip.id,
      text: `${name} has sent you an invite to join a trip to ${validateTrip.destination}`,
    };

    notificationEmitter.emit(`user:${inviteInDb.userInvited}`, eventInputs);
    return NextResponse.json(
      { msg: "invite sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
