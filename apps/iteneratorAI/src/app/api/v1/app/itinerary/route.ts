import { NextRequest, NextResponse } from "next/server";
import { aiResponseHandler } from "./handler";
import { authFunction, requireAuth } from "@/utils/authUtils";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { id } = auth.details;

    return aiResponseHandler(req, id);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ msg: "internal server error" }, { status: 500 });
  }
}

// function setTimeoutPromisified(delay: number) {
//   return new Promise((res) =>
//     setTimeout(() => res(delay), delay);
//   });
// }
// setTimeoutPromisified(1000).then(() => {});
