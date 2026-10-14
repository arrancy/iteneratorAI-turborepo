import { requireAuth } from "@/utils/authUtils";
import { NextResponse } from "next/server";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { id } = auth.details;
  return NextResponse.json({ msg: "hello from agent " }, { status: 200 });
}
