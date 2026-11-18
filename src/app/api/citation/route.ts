import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { ragVerifyCitation } from "@/lib/rag-client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const c = req.nextUrl.searchParams.get("c") || "";
    if (!c.trim()) {
      return jsonError(400, "bad_request", "Query parameter 'c' (citation_string) is required.");
    }
    const result = await ragVerifyCitation(c.trim());
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
