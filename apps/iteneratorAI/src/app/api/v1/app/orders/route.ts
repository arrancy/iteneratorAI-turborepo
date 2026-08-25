import { requireAuth } from "@/utils/authUtils";

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { id, name } = auth.details;
  } catch (error) {}
}
