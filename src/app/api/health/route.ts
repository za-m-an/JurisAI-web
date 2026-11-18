import { NextResponse } from "next/server";
import { ensureMigrated, query } from "@/lib/db";
import { ragHealth } from "@/lib/rag-client";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureMigrated();
    await query("SELECT 1 AS ok");
    let ragMock = false;
    let ragReachable = false;
    try {
      const { health } = await ragHealth();
      ragMock = !!health.mock;
      ragReachable = health.status === "ok";
    } catch {
      // RAG unreachable
    }
    return NextResponse.json(
      {
        status: "ok",
        db: "reachable",
        rag: { reachable: ragReachable, mock: ragMock },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "db_unreachable", message: "Database is unreachable" },
      { status: 503 }
    );
  }
}
