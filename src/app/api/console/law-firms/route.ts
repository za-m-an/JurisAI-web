import { NextRequest } from "next/server";
import { z } from "zod";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { getClientIp, verifyCsrfOrigin } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

const CreateLawFirmSchema = z.object({
  name: z.string().trim().min(2).max(160),
  leadCounsel: z.string().trim().min(2).max(160),
  region: z.enum(["BD", "US", "EU"]),
  city: z.string().trim().min(2).max(120),
  specialties: z.array(z.string().trim().min(1)).min(1),
  experienceYears: z.number().int().min(1).max(150).default(15),
  notableCases: z.array(z.string().trim().min(1)).default([]),
  recentNews: z.string().trim().max(500).default(""),
  phone: z.string().trim().min(3).max(60),
  email: z.string().trim().email(),
  address: z.string().trim().min(3).max(250),
});

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdminConsole(req);

    const res = await query(
      `SELECT id, name, lead_counsel, region, city, specialties, experience_years, notable_cases, recent_news, phone, email, address, created_at
       FROM law_firms ORDER BY region ASC, experience_years DESC, name ASC`
    );

    return adminJsonResponse({
      lawFirms: res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        leadCounsel: r.lead_counsel,
        region: r.region,
        city: r.city,
        specialties: r.specialties || [],
        experienceYears: r.experience_years,
        notableCases: r.notable_cases || [],
        recentNews: r.recent_news,
        phone: r.phone,
        email: r.email,
        address: r.address,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const parsed = CreateLawFirmSchema.parse(body);

    const inserted = await query(
      `INSERT INTO law_firms (name, lead_counsel, region, city, specialties, experience_years, notable_cases, recent_news, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        parsed.name,
        parsed.leadCounsel,
        parsed.region,
        parsed.city,
        parsed.specialties,
        parsed.experienceYears,
        parsed.notableCases,
        parsed.recentNews,
        parsed.phone,
        parsed.email,
        parsed.address,
      ]
    );

    await logAudit({
      userId: admin.id,
      action: "console_create_law_firm",
      target: inserted.rows[0].id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: { name: parsed.name, region: parsed.region },
    });

    return adminJsonResponse({ ok: true, id: inserted.rows[0].id }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return adminJsonResponse({ error: "missing_id", message: "Firm ID required." }, { status: 400 });
    }

    await query("DELETE FROM law_firms WHERE id = $1", [id]);
    await logAudit({
      userId: admin.id,
      action: "console_delete_law_firm",
      target: id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: {},
    });

    return adminJsonResponse({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
