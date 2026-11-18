import { NextRequest, NextResponse } from "next/server";
import {
  buildClearSessionCookieHeader,
  getClientIp,
  requireUser,
  verifyCsrfOrigin,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);

    await query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [user.id]);
    await logAudit({
      userId: user.id,
      action: "logout",
      target: "logout_all_sessions",
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
