import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, buildClearAdminSessionCookieHeader } from "@/lib/admin-auth";
import { verifyCsrfOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  verifyCsrfOrigin(req);
  return adminJsonResponse(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildClearAdminSessionCookieHeader(),
      },
    }
  );
}
