import fs from "fs";
import path from "path";
import { Pool, PoolClient } from "pg";
import { PGlite } from "@electric-sql/pglite";

export interface QueryResult<T = Record<string, any>> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = Record<string, any>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

const globalForDb = globalThis as unknown as {
  __jurisPgPool?: Pool;
  __jurisPglite?: PGlite;
  __jurisMigrated?: boolean;
};

function getDriver(): "pg" | "pglite" {
  const explicit = (process.env.DB_DRIVER || "").trim().toLowerCase();
  if (explicit === "pg") return "pg";
  if (explicit === "pglite") return "pglite";
  return process.env.DATABASE_URL ? "pg" : "pglite";
}

function getPgPool(): Pool {
  if (!globalForDb.__jurisPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required when DB_DRIVER=pg");
    }
    const needsSsl =
      connectionString.includes("neon.tech") || connectionString.includes("sslmode=require");
    globalForDb.__jurisPgPool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: true } : undefined,
      max: 3,
    });
  }
  return globalForDb.__jurisPgPool;
}

function getPgliteInstance(): PGlite {
  if (!globalForDb.__jurisPglite) {
    if (process.env.NODE_ENV === "test") {
      globalForDb.__jurisPglite = new PGlite();
    } else {
      const dataDir = path.resolve(process.cwd(), ".data", "pglite");
      fs.mkdirSync(dataDir, { recursive: true });
      globalForDb.__jurisPglite = new PGlite(dataDir);
    }
  }
  return globalForDb.__jurisPglite;
}

export async function query<T = Record<string, any>>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const driver = getDriver();
  if (driver === "pg") {
    const pool = getPgPool();
    const res = await pool.query(text, params);
    return {
      rows: (res.rows || []) as T[],
      rowCount: res.rowCount ?? (res.rows ? res.rows.length : 0),
    };
  }
  const pglite = getPgliteInstance();
  const res = await pglite.query<T>(text, params);
  return {
    rows: (res.rows || []) as T[],
    rowCount: (res as any).affectedRows ?? (res.rows ? res.rows.length : 0),
  };
}

export async function tx<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const driver = getDriver();
  if (driver === "pg") {
    const pool = getPgPool();
    const client: PoolClient = await pool.connect();
    try {
      await client.query("BEGIN");
      const wrapped: DbClient = {
        async query<R = Record<string, any>>(qText: string, qParams: unknown[] = []) {
          const r = await client.query(qText, qParams);
          return { rows: (r.rows || []) as R[], rowCount: r.rowCount ?? 0 };
        },
      };
      const out = await fn(wrapped);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  const pglite = getPgliteInstance();
  await pglite.query("BEGIN");
  try {
    const wrapped: DbClient = {
      async query<R = Record<string, any>>(qText: string, qParams: unknown[] = []) {
        const r = await pglite.query<R>(qText, qParams);
        return {
          rows: (r.rows || []) as R[],
          rowCount: (r as any).affectedRows ?? (r.rows ? r.rows.length : 0),
        };
      },
    };
    const out = await fn(wrapped);
    await pglite.query("COMMIT");
    return out;
  } catch (err) {
    await pglite.query("ROLLBACK");
    throw err;
  }
}

export async function ensureMigrated(): Promise<void> {
  if (globalForDb.__jurisMigrated) return;
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  if (!fs.existsSync(migrationsDir)) return;

  const pgliteOrPg = getDriver();
  await query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await query<{ version: string }>(
      "SELECT version FROM schema_migrations WHERE version = $1",
      [file]
    );
    if (existing.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    if (pgliteOrPg === "pglite") {
      const pglite = getPgliteInstance();
      await pglite.exec(sql);
    } else {
      await query(sql);
    }
    await query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING", [
      file,
    ]);
  }

  if (process.env.RAG_BASE_URL) {
    await query(
      "UPDATE integrations SET base_url = $1 WHERE slug = 'rag' AND (base_url = 'http://localhost:8001' OR base_url IS NULL)",
      [process.env.RAG_BASE_URL]
    );
  }
  globalForDb.__jurisMigrated = true;
}

export function resetDbForTests(): void {
  globalForDb.__jurisPglite = undefined;
  globalForDb.__jurisMigrated = false;
}
