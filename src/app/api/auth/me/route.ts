import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/http-error";
import { getUserQuotaUsage } from "@/lib/quota";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const quota = await getUserQuotaUsage(user);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        professionalLevel: user.professional_level,
        organisation: user.organisation,
        createdAt: user.created_at,
      },
      quota,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
