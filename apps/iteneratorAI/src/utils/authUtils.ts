import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { success } from "zod";

export async function authFunction(): Promise<{
  status: "success" | "noName" | "failure";
  details?: { name: string; id: string };
}> {
  const currentSession = await getServerSession(authOptions);
  if (!currentSession?.user?.id) return { status: "failure" };
  if (!currentSession.user.name) return { status: "noName" };
  const { name, id } = currentSession.user;
  return { status: "success", details: { name, id } };
}

type AuthResponse =
  | {
      success: true;
      details: { name: string; id: string };
    }
  | { success: false; response: NextResponse };

export async function requireAuth(): Promise<AuthResponse> {
  const authFuncResponse = await authFunction();
  if (authFuncResponse.status === "failure")
    return {
      success: false,
      response: NextResponse.json({ msg: "unauthenticated" }, { status: 401 }),
    };
  if (authFuncResponse.status === "noName") {
    return {
      success: false,
      response: NextResponse.json(
        { msg: "please give a name" },
        { status: 300 },
      ),
    };
  }

  const { id, name } = authFuncResponse.details!;
  return { success: true, details: { id, name } };
}
