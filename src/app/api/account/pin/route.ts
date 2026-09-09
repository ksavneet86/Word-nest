import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { parentHasPin, setParentPin } from "@/lib/server/parent-pin";

/** Whether the signed-in account has a Parent PIN set (the hash is never exposed). */
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ hasPin: await parentHasPin(user.id) });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Create the Parent PIN, or change it (send `currentPin` alongside the new `pin`). */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    await setParentPin(user.id, body?.pin, body?.currentPin);
    return NextResponse.json({ ok: true, hasPin: true });
  } catch (e) {
    return handleApiError(e);
  }
}
