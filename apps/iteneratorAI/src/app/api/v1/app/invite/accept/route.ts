import { requireAuth } from "@/utils/authUtils";
import { acceptInviteSchema } from "@/zodTypes/acceptInvite";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@repo/db";
import z from "zod";
import {
  notificationEmitter,
  NotificationEventArgs,
  NotificationPurpose,
} from "@/lib/notificationEmitter/notificationEventEmitter";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id, name } = auth.details;
    const reqBody = await req.json();
    const { success } = acceptInviteSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 401 });

    const incomingData: z.infer<typeof acceptInviteSchema> = reqBody;
    const { inviteId } = incomingData;
    const inviteIsReal = await prisma.invite.findUnique({
      where: { id: inviteId },
      include: { trip: true, sender: true },
    });
    if (!inviteIsReal)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });

    const { userInvited } = inviteIsReal;
    if (!(userInvited === id && inviteIsReal.status === "pending"))
      return NextResponse.json(
        { msg: "invalid inputs or wrong request" },
        { status: 400 },
      );
    const [inviteAccepted, tripMemberAdded] = await prisma.$transaction([
      prisma.invite.update({
        where: { id: inviteIsReal.id },
        data: { status: "accepted" },
      }),
      prisma.tripMember.create({
        data: { userId: id, tripId: inviteIsReal.tripId },
      }),
    ]);
    if (
      !inviteAccepted ||
      !(inviteAccepted.status === "accepted") ||
      !tripMemberAdded
    )
      return NextResponse.json(
        { msg: "error updating database" },
        { status: 400 },
      );
    const senderUserId = inviteIsReal.invitedBy;
    const tripId = inviteAccepted.tripId;
    const eventInputs: NotificationEventArgs = {
      type: "notification",
      purpose: NotificationPurpose.accepted,
      actingUserId: userInvited,
      inviteId: inviteIsReal.id,
      tripId: tripId,
      text: `${name} has accepted your invite to join the trip to ${inviteIsReal.trip.destination}`,
    };
    notificationEmitter.emit(`user:${senderUserId}`, eventInputs);
    return NextResponse.json({ msg: "invite accepted" });
  } catch (error) {
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  } // retrieval , checking , second call updation , no transaction needed
}
