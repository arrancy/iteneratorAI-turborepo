import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { addNameSchema } from "@/zodTypes/addName";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@repo/db";
import z from "zod";

export default async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ msg: "unauthenticated" }, { status: 401 });
    const { id } = session.user;
    const reqBody = await req.json();
    const { success } = addNameSchema.safeParse(reqBody);
    if (!success)
      return NextResponse.json({ msg: "invalid inputs" }, { status: 400 });
    const incomingData: z.infer<typeof addNameSchema> = reqBody;
    const { name } = incomingData;
    const nameInDb = await prisma.user.update({
      where: { id },
      data: { name },
    });
    if (!nameInDb || !nameInDb.name)
      return NextResponse.json(
        { msg: "internal server error" },
        { status: 500 },
      );

    return NextResponse.json(
      {
        msg: "name added successfully",
        name: nameInDb.name,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}
