import { decryptSecret } from "./crypto";
import { ensureMigrated, query } from "./db";

export interface RagContextItem {
  id: string;
  citation_string: string;
  jurisdiction: "BD" | "US" | "EU";
  title: string;
  text: string;
  source_url: string;
  source_type: "full_text" | "provision_summary" | "case_reference" | "law_summary";
  verified: boolean;
  confidence: "high" | "medium" | "low";
}

export interface RagCitation {
  citation_string: string;
  quote?: string | null;
  status: "verified" | "found_in_corpus" | "unverified";
  reason: string;
}

export interface RagRiskItem {
  title: string;
  clause_refs: string[];
  why_non_obvious: string;
  severity: "high" | "medium" | "low";
  jurisdiction_notes: { BD: string; US: string; EU: string };
  citations: RagCitation[];
  mitigation_clause_text: string;
}

export interface RagAnalyzeResponse {
  summary: string;
  document_type: string;
  governing_law: string;
  risks: RagRiskItem[];
  verification: {
    total: number;
    verified: number;
    found_in_corpus: number;
    unverified: number;
  };
  memo_markdown: string;
  disclaimer: string;
  model_info: {
    main: string;
    small: string;
    mock: boolean;
  };
  timings_ms: {
    rewrite: number;
    retrieval: number;
    analysis: number;
    verification: number;
    memo: number;
    total: number;
  };
}

export interface RagChatResponse {
  answer_markdown: string;
  citations: Array<{
    citation_string: string;
    status: "verified" | "found_in_corpus" | "unverified";
    reason: string;
  }>;
  disclaimer: string;
  mock: boolean;
}

export interface RagHealthResponse {
  status: "ok";
  version: string;
  mock: boolean;
  embeddings: string;
  corpus: {
    documents: number;
    by_jurisdiction: { BD: number; US: number; EU: number };
    full_text_documents: number;
  };
}

export interface RagCitationLookupResponse {
  citation_string: string;
  status: "verified" | "found_in_corpus" | "unverified";
  reason: string;
  source_url: string | null;
}

export class RagClientError extends Error {
  status: number;
  code: string;
  adminMessage: string;
  userMessage: string;

  constructor(status: number, code: string, userMessage: string, adminMessage?: string) {
    super(userMessage);
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
    this.adminMessage = adminMessage || userMessage;
  }
}

interface CachedRagConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  expiresAt: number;
}

let cachedConfig: CachedRagConfig | null = null;
let cachedAiHeaders: { headers: Record<string, string>; expiresAt: number } | null = null;

export function invalidateRagConfigCache(): void {
  cachedConfig = null;
  cachedAiHeaders = null;
}

export async function getActiveAiHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedAiHeaders && cachedAiHeaders.expiresAt > now) {
    return cachedAiHeaders.headers;
  }

  await ensureMigrated();
  const settingsRows = await query<{ key: string; value: any }>(
    "SELECT key, value FROM settings WHERE key LIKE 'ai.%'"
  );
  const settings: Record<string, any> = {};
  for (const r of settingsRows.rows) {
    settings[r.key] = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
  }

  const mainProvider = String(settings["ai.provider_main"] || "anthropic").toLowerCase();
  const mainModel = String(settings["ai.model_main"] || "claude-sonnet-5-5");
  const ragProvider = String(settings["ai.provider_rag"] || "openai").toLowerCase();
  const ragModel = String(settings["ai.model_rag"] || "gpt-4o-mini");

  const intRows = await query<{
    slug: string;
    base_url: string;
    api_key_enc: string | null;
  }>("SELECT slug, base_url, api_key_enc FROM integrations WHERE slug IN ($1, $2)", [
    mainProvider,
    ragProvider,
  ]);

  const bySlug: Record<string, { baseUrl: string; apiKey: string }> = {};
  for (const row of intRows.rows) {
    let key = "";
    if (row.api_key_enc) {
      try {
        key = decryptSecret(row.api_key_enc);
      } catch {
        key = "";
      }
    }
    bySlug[row.slug] = { baseUrl: row.base_url, apiKey: key };
  }

  const headers: Record<string, string> = {
    "X-LLM-Provider": mainProvider,
    "X-LLM-Model-Main": mainModel,
    "X-RAG-LLM-Provider": ragProvider,
    "X-RAG-LLM-Model": ragModel,
  };

  if (bySlug[mainProvider]?.apiKey) {
    headers["X-LLM-API-Key"] = bySlug[mainProvider].apiKey;
  }
  if (bySlug[mainProvider]?.baseUrl && (mainProvider === "custom" || mainProvider === "custom-llm")) {
    headers["X-LLM-Base-URL"] = bySlug[mainProvider].baseUrl;
  }

  if (bySlug[ragProvider]?.apiKey) {
    headers["X-RAG-LLM-API-Key"] = bySlug[ragProvider].apiKey;
  }
  if (bySlug[ragProvider]?.baseUrl && (ragProvider === "custom" || ragProvider === "custom-llm")) {
    headers["X-RAG-LLM-Base-URL"] = bySlug[ragProvider].baseUrl;
  }

  cachedAiHeaders = {
    headers,
    expiresAt: now + 30_000,
  };
  return headers;
}

export async function getRagConfig(): Promise<{ baseUrl: string; apiKey: string; enabled: boolean }> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return {
      baseUrl: cachedConfig.baseUrl,
      apiKey: cachedConfig.apiKey,
      enabled: cachedConfig.enabled,
    };
  }

  await ensureMigrated();
  const envUrl = (process.env.RAG_BASE_URL || "http://localhost:8001").trim().replace(/\/+$/, "");
  const envKey = (process.env.RAG_API_KEY || "dev-rag-key").trim();

  const res = await query<{
    base_url: string | null;
    api_key_enc: string | null;
    enabled: boolean;
  }>("SELECT base_url, api_key_enc, enabled FROM integrations WHERE slug = 'rag' LIMIT 1");

  let baseUrl = envUrl;
  let apiKey = envKey;
  let enabled = true;

  if (res.rows.length > 0) {
    const row = res.rows[0];
    enabled = row.enabled !== false;
    if (row.base_url && row.base_url.trim()) {
      baseUrl = row.base_url.trim().replace(/\/+$/, "");
    }
    if (row.api_key_enc) {
      try {
        const dec = decryptSecret(row.api_key_enc);
        if (dec) apiKey = dec;
      } catch {
        // Fallback to envKey if decryption fails
      }
    }
  }

  cachedConfig = {
    baseUrl,
    apiKey,
    enabled,
    expiresAt: now + 30_000,
  };
  return { baseUrl, apiKey, enabled };
}

async function ragFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs: number;
    includeAuth?: boolean;
  }
): Promise<T> {
  const { baseUrl, apiKey, enabled } = await getRagConfig();
  if (!enabled) {
    throw new RagClientError(503, "rag_disabled", "RAG service unreachable", "RAG integration is disabled");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.includeAuth !== false) {
    headers["X-API-Key"] = apiKey;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const aiHeaders = await getActiveAiHeaders();
    for (const [k, v] of Object.entries(aiHeaders)) {
      if (v) headers[k] = v;
    }
  } catch {
    // Non-blocking fallback to server defaults
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw new RagClientError(
      503,
      "rag_unreachable",
      "RAG service unreachable",
      "RAG service unreachable"
    );
  }
  clearTimeout(timer);

  if (!response.ok) {
    if (response.status === 401) {
      throw new RagClientError(
        502,
        "rag_auth_error",
        "AI analysis service configuration error",
        "RAG API key rejected"
      );
    }
    if (response.status === 503) {
      throw new RagClientError(
        503,
        "llm_unavailable",
        "AI model temporarily unavailable",
        "AI model temporarily unavailable"
      );
    }
    if (response.status === 413) {
      throw new RagClientError(413, "too_long", "Document too large", "Document too large");
    }
    throw new RagClientError(
      502,
      "rag_error",
      "RAG service returned an error",
      `RAG returned HTTP ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export async function ragHealth(): Promise<{ health: RagHealthResponse; latencyMs: number }> {
  const t0 = Date.now();
  const health = await ragFetch<RagHealthResponse>("/health", {
    method: "GET",
    timeoutMs: 10_000,
    includeAuth: false,
  });
  return { health, latencyMs: Date.now() - t0 };
}

export async function ragSearch(params: {
  query: string;
  jurisdictions?: Array<"BD" | "US" | "EU">;
  risk_tags?: string[];
  k?: number;
}): Promise<{ context: RagContextItem[] }> {
  return ragFetch<{ context: RagContextItem[] }>("/rag/search", {
    method: "POST",
    body: params,
    timeoutMs: 10_000,
    includeAuth: true,
  });
}

export async function ragAnalyze(params: {
  document_text: string;
  jurisdictions?: Array<"BD" | "US" | "EU">;
  doc_name?: string;
}): Promise<RagAnalyzeResponse> {
  return ragFetch<RagAnalyzeResponse>("/analyze", {
    method: "POST",
    body: params,
    timeoutMs: 280_000,
    includeAuth: true,
  });
}

export async function ragChat(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  jurisdictions?: Array<"BD" | "US" | "EU">;
  context_note?: string;
}): Promise<RagChatResponse> {
  return ragFetch<RagChatResponse>("/chat", {
    method: "POST",
    body: params,
    timeoutMs: 60_000,
    includeAuth: true,
  });
}

export async function ragVerifyCitation(
  citationString: string
): Promise<RagCitationLookupResponse> {
  const encoded = encodeURIComponent(citationString);
  return ragFetch<RagCitationLookupResponse>(`/citation/${encoded}`, {
    method: "GET",
    timeoutMs: 10_000,
    includeAuth: true,
  });
}
