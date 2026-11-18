import { ensureMigrated, query } from "./db";

export type AuditAction =
  | "register"
  | "login_success"
  | "login_failed"
  | "logout"
  | "analyze_start"
  | "analyze_done"
  | "analyze_failed"
  | "chat"
  | "account_deleted"
  | "data_deleted"
  | "update_profile"
  | "password_changed"
  | "totp_enrolled"
  | "totp_verified"
  | "totp_reset"
  | "admin_user_updated"
  | "admin_integration_updated"
  | "admin_settings_updated"
  | "rate_limited";

export interface AuditEntryInput {
  userId?: string | null;
  action: AuditAction;
  target?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntryInput): Promise<void> {
  await ensureMigrated();
  await query(
    `INSERT INTO audit_logs (user_id, action, target, ip, user_agent, meta)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      entry.userId ?? null,
      entry.action,
      entry.target ?? null,
      entry.ip ?? null,
      entry.userAgent ?? null,
      JSON.stringify(entry.meta || {}),
    ]
  );
}
