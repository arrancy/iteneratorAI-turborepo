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
    include: { trip: true },
  });
  if (!inviteIsReal)
    return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });

  const { userInvited } = inviteIsReal;
  if (!(userInvited === id && inviteIsReal.status === "pending"))
    return NextResponse.json(
      { msg: "invalid inputs or wrong request" },
      { status: 400 },
    );
  const inviteAccepted = await prisma.invite.update({
    where: { id: inviteIsReal.id },
    data: { status: "accepted" },
  });
  if (!inviteAccepted || !(inviteAccepted.status === "accepted"))
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
    text: `${userInvited} has accepted your invite to join the trip to ${inviteIsReal.trip.destination}`,
  };
  const inviteSenderId = notificationEmitter.emit(
    `user:${senderUserId}`,
    eventInputs,
  );
  return NextResponse.json({ msg: "invite accepted" });
  // retrieval , checking , second call updation , no transaction needed
}
