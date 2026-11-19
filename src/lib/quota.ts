import { AuthenticatedUser } from "./auth";
import { ensureMigrated, query } from "./db";

export class QuotaExceededError extends Error {
  status = 429;
  code = "quota_exceeded";

  constructor(message: string) {
    super(message);
  }
}

export interface SystemSettings {
  "quota.common.analyses_per_month": number;
  "quota.business.analyses_per_month": number;
  "quota.lawyer.analyses_per_month": number;
  "quota.common.chat_per_day": number;
  "quota.business.chat_per_day": number;
  "quota.lawyer.chat_per_day": number;
  max_upload_mb: number;
  mask_pii: boolean;
  default_jurisdictions: Array<"BD" | "US" | "EU">;
  "ai.provider_main"?: "anthropic" | "openai" | "deepseek" | "openrouter" | "aws" | "custom";
  "ai.model_main"?: string;
  "ai.provider_rag"?: "openai" | "deepseek" | "anthropic" | "openrouter" | "aws" | "custom";
  "ai.model_rag"?: string;
  "ai.token_optimization_enabled"?: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  "quota.common.analyses_per_month": 3,
  "quota.business.analyses_per_month": 30,
  "quota.lawyer.analyses_per_month": 30,
  "quota.common.chat_per_day": 30,
  "quota.business.chat_per_day": 100,
  "quota.lawyer.chat_per_day": 100,
  max_upload_mb: 4,
  mask_pii: true,
  default_jurisdictions: ["BD", "US", "EU"],
  "ai.provider_main": "anthropic",
  "ai.model_main": "claude-sonnet-5-5",
  "ai.provider_rag": "openai",
  "ai.model_rag": "gpt-4o-mini",
};

export async function getSystemSettings(): Promise<SystemSettings> {
  await ensureMigrated();
  const res = await query<{ key: string; value: unknown }>("SELECT key, value FROM settings");
  const merged: Record<string, any> = { ...DEFAULT_SETTINGS };
  for (const row of res.rows) {
    let val = row.value;
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        // keep string
      }
    }
    merged[row.key] = val;
  }
  merged.max_upload_mb = Math.min(4, Math.max(1, Number(merged.max_upload_mb || 4)));
  return merged as SystemSettings;
}

/**
 * Housekeeping: mark analyses stuck in 'processing' for > 10 minutes as 'failed' ("timed out").
 */
export async function cleanupStuckAnalyses(): Promise<number> {
  await ensureMigrated();
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const res = await query(
    `UPDATE analyses
     SET status = 'failed', error = 'timed out', finished_at = NOW()
     WHERE status = 'processing' AND created_at < $1`,
    [tenMinAgo]
  );
  return res.rowCount;
}

export async function getUserQuotaUsage(user: AuthenticatedUser): Promise<{
  analysesUsedThisMonth: number;
  analysesLimitPerMonth: number;
  chatUsedToday: number;
  chatLimitPerDay: number;
}> {
  await ensureMigrated();
  await cleanupStuckAnalyses();
  const settings = await getSystemSettings();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();

  const analysesRes = await query<{ cnt: string | number }>(
    `SELECT COUNT(*) AS cnt FROM analyses
     WHERE user_id = $1 AND status != 'failed' AND created_at >= $2`,
    [user.id, monthStart]
  );
  const chatRes = await query<{ cnt: string | number }>(
    `SELECT COUNT(*) AS cnt FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE c.user_id = $1 AND m.role = 'user' AND m.created_at >= $2`,
    [user.id, dayStart]
  );

  const roleKey = user.role === "admin" ? "business" : user.role;
  const analysesLimit =
    user.role === "admin"
      ? 9999
      : Number((settings as any)[`quota.${roleKey}.analyses_per_month`] ?? 3);
  const chatLimit =
    user.role === "admin"
      ? 9999
      : Number((settings as any)[`quota.${roleKey}.chat_per_day`] ?? 30);

  return {
    analysesUsedThisMonth: Number(analysesRes.rows[0]?.cnt || 0),
    analysesLimitPerMonth: analysesLimit,
    chatUsedToday: Number(chatRes.rows[0]?.cnt || 0),
    chatLimitPerDay: chatLimit,
  };
}

export async function enforceAnalysisQuota(user: AuthenticatedUser): Promise<void> {
  const usage = await getUserQuotaUsage(user);
  if (usage.analysesUsedThisMonth >= usage.analysesLimitPerMonth) {
    throw new QuotaExceededError(
      `Monthly analysis quota exceeded (${usage.analysesUsedThisMonth}/${usage.analysesLimitPerMonth} for role '${user.role}').`
    );
  }
}

export async function enforceChatQuota(user: AuthenticatedUser): Promise<void> {
  const usage = await getUserQuotaUsage(user);
  if (usage.chatUsedToday >= usage.chatLimitPerDay) {
    throw new QuotaExceededError(
      `Daily chat message quota exceeded (${usage.chatUsedToday}/${usage.chatLimitPerDay} for role '${user.role}').`
    );
  }
}
