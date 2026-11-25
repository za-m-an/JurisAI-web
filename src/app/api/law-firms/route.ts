import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const regionFilter = searchParams.get("region") || user.region || "BD";
    const analysisId = searchParams.get("analysisId");

    // Fetch latest or specified analysis for AI ranking calibration
    let caseTopics: string[] = [];
    let caseTitle: string | null = null;
    if (analysisId) {
      const anRes = await query(
        "SELECT doc_name, reference_code, result FROM analyses WHERE id = $1 AND user_id = $2 LIMIT 1",
        [analysisId, user.id]
      );
      if (anRes.rows[0]) {
        const r = anRes.rows[0];
        caseTitle = `${r.doc_name} (${r.reference_code || "Analysis"})`;
        caseTopics = extractTopics(r.result);
      }
    } else {
      const anRes = await query(
        "SELECT doc_name, reference_code, result FROM analyses WHERE user_id = $1 AND status = 'done' ORDER BY created_at DESC LIMIT 1",
        [user.id]
      );
      if (anRes.rows[0]) {
        const r = anRes.rows[0];
        caseTitle = `${r.doc_name} (${r.reference_code || "Latest"})`;
        caseTopics = extractTopics(r.result);
      }
    }

    const res = await query(
      `SELECT id, name, lead_counsel, region, city, specialties, experience_years, notable_cases, recent_news, phone, email, address
       FROM law_firms WHERE region = $1`,
      [regionFilter]
    );

    const ranked = res.rows
      .map((f) => {
        const specs: string[] = f.specialties || [];
        const exp: number = f.experience_years || 10;
        let matchBonus = 0;
        for (const t of caseTopics) {
          if (specs.some((s) => s.toLowerCase().includes(t) || t.includes(s.toLowerCase()))) {
            matchBonus += 4;
          }
        }
        const aiRating = Math.min(99, 84 + Math.min(10, Math.floor(exp / 4)) + matchBonus);
        return {
          id: f.id,
          name: f.name,
          leadCounsel: f.lead_counsel,
          region: f.region,
          city: f.city,
          specialties: specs,
          experienceYears: exp,
          notableCases: f.notable_cases || [],
          recentNews: f.recent_news,
          aiRating,
          contact: {
            phone: f.phone,
            email: f.email,
            address: f.address,
          },
        };
      })
      .sort((a, b) => b.aiRating - a.aiRating);

    return NextResponse.json({
      lawFirms: ranked,
      matchedCaseTitle: caseTitle,
      region: regionFilter,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

function extractTopics(result: any): string[] {
  if (!result || !Array.isArray(result.risks)) return [];
  const text = result.risks
    .map((r: any) => `${r.issue || ""} ${r.title || ""} ${r.why_non_obvious || ""}`)
    .join(" ")
    .toLowerCase();
  const topics: string[] = [];
  if (text.includes("arbitration") || text.includes("dispute")) topics.push("arbitration");
  if (text.includes("restraint") || text.includes("competition") || text.includes("antitrust")) topics.push("competition");
  if (text.includes("contract") || text.includes("penalty") || text.includes("damages")) topics.push("commercial");
  if (text.includes("penal") || text.includes("fraud") || text.includes("criminal")) topics.push("penal");
  if (text.includes("cyber") || text.includes("gdpr") || text.includes("data")) topics.push("cyber");
  return topics;
}
