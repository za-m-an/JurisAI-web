import { ensureMigrated, query } from "./db";
import { logAudit } from "./audit";

export class RateLimitError extends Error {
  status = 429;
  code = "rate_limited";
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  userId?: string | null;
  ip?: string | null;
}): Promise<void> {
  await ensureMigrated();
  const now = new Date();
  const windowStartCutoff = new Date(now.getTime() - params.windowSeconds * 1000);

  const existing = await query<{ key: string; window_start: string | Date; count: number }>(
    "SELECT key, window_start, count FROM rate_limits WHERE key = $1",
    [params.key]
  );

  if (existing.rows.length === 0) {
    await query(
      "INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1) ON CONFLICT (key) DO UPDATE SET window_start = $2, count = 1",
      [params.key, now.toISOString()]
    );
    return;
  }

  const row = existing.rows[0];
  const windowStart = new Date(row.window_start);
  if (windowStart < windowStartCutoff) {
    await query("UPDATE rate_limits SET window_start = $2, count = 1 WHERE key = $1", [
      params.key,
      now.toISOString(),
    ]);
    return;
  }

  const currentCount = Number(row.count);
  if (currentCount >= params.limit) {
    const elapsedSec = (now.getTime() - windowStart.getTime()) / 1000;
    const retryAfter = Math.max(1, Math.ceil(params.windowSeconds - elapsedSec));
    await logAudit({
      userId: params.userId ?? null,
      action: "rate_limited",
      target: params.key,
      ip: params.ip ?? null,
      meta: { limit: params.limit, windowSeconds: params.windowSeconds },
    });
    throw new RateLimitError("Too many requests. Please try again later.", retryAfter);
  }

  await query("UPDATE rate_limits SET count = count + 1 WHERE key = $1", [params.key]);
}
