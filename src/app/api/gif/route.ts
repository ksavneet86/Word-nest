import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";

/** Server-side Giphy lookup for MotionClip — replaces the reference artifact's public demo key. */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const query = request.nextUrl.searchParams.get("query");
    if (!query) throw new BadRequestError("query is required");

    const apiKey = process.env.GIPHY_API_KEY;
    if (!apiKey) return NextResponse.json({ url: null });

    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1&rating=g`
    );
    if (!res.ok) return NextResponse.json({ url: null });
    const data = await res.json();
    const item = data?.data?.[0];
    const url = item?.images?.fixed_height_small?.url || item?.images?.original?.url || null;
    return NextResponse.json({ url });
  } catch (e) {
    return handleApiError(e);
  }
}
