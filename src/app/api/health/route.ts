import { NextResponse } from "next/server";
import { ensureMigrated, query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureMigrated();
    await query("SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", db: "reachable" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "db_unreachable", message: "Database is unreachable" },
      { status: 503 }
    );
  }
}
