import { z } from "zod";

export const JurisdictionEnum = z.enum(["BD", "US", "EU"]);

export const RegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
    email: z.string().trim().email("Valid email address is required").transform((s) => s.toLowerCase()),
    password: z.string().min(10, "Password must be at least 10 characters").max(200),
    accountType: z.enum(["business", "common"]),
    organisation: z.string().trim().max(160).optional().nullable(),
  })
  .refine((d) => d.accountType !== "business" || Boolean(d.organisation && d.organisation.trim().length > 0), {
    message: "Organisation name is required for business accounts",
    path: ["organisation"],
  });

export const LoginSchema = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional().nullable(),
  message: z.string().trim().min(1, "Message cannot be empty").max(8000),
  jurisdictions: z.array(JurisdictionEnum).min(1).max(3).optional(),
  analysisId: z.string().uuid().optional().nullable(),
  contextNote: z.string().max(8000).optional().nullable(),
  mode: z.enum(["conversational", "memorandum"]).optional().default("conversational"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(200),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120).optional(),
  organisation: z.string().trim().max(160).nullable().optional(),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Password confirmation is required"),
});

export const AdminUserPatchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "business", "common", "lawyer"]).optional(),
  professionalLevel: z.enum(["trainee", "attorney", "barrister", "advocate"]).nullable().optional(),
  isActive: z.boolean().optional(),
  forceLogout: z.boolean().optional(),
});

export const AdminUserCreateSchema = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "business", "common", "lawyer"]),
  professionalLevel: z.enum(["trainee", "attorney", "barrister", "advocate"]).nullable().optional(),
  organisation: z.string().trim().max(160).nullable().optional(),
  temporaryPassword: z.string().min(10).max(200),
});

export const AdminIntegrationPutSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  baseUrl: z.string().trim().url(),
  apiKey: z.string().optional().nullable(),
  healthPath: z.string().trim().min(1).max(120).default("/health"),
  enabled: z.boolean(),
});

export const AdminSettingsPutSchema = z.object({
  "quota.common.analyses_per_month": z.number().int().min(0).max(10000).optional(),
  "quota.business.analyses_per_month": z.number().int().min(0).max(10000).optional(),
  "quota.lawyer.analyses_per_month": z.number().int().min(0).max(10000).optional(),
  "quota.common.chat_per_day": z.number().int().min(0).max(10000).optional(),
  "quota.business.chat_per_day": z.number().int().min(0).max(10000).optional(),
  "quota.lawyer.chat_per_day": z.number().int().min(0).max(10000).optional(),
  max_upload_mb: z.number().min(1).max(4).optional(),
  mask_pii: z.boolean().optional(),
  default_jurisdictions: z.array(JurisdictionEnum).min(1).max(3).optional(),
  "ai.provider_main": z.enum(["anthropic", "openai", "deepseek", "openrouter", "aws", "custom"]).optional(),
  "ai.model_main": z.string().trim().min(1).max(120).optional(),
  "ai.provider_rag": z.enum(["openai", "deepseek", "anthropic", "openrouter", "aws", "custom"]).optional(),
  "ai.model_rag": z.string().trim().min(1).max(120).optional(),
  "ai.token_optimization_enabled": z.boolean().optional(),
});
