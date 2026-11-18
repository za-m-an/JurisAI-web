import { NextRequest, NextResponse } from "next/server";
import {
  buildClearSessionCookieHeader,
  getClientIp,
  requireUser,
  verifyCsrfOrigin,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    let userId: string | null = null;
    try {
      const user = await requireUser(req);
      userId = user.id;
    } catch {
      // Allow logout even if session is already expired
    }

    await logAudit({
      userId,
      action: "logout",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildClearSessionCookieHeader(),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
