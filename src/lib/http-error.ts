import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { ExtractionError } from "./extract";
import { QuotaExceededError } from "./quota";
import { RagClientError } from "./rag-client";
import { RateLimitError } from "./rate-limit";

export function jsonError(
  status: number,
  error: string,
  message: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error, message },
    { status, headers: extraHeaders }
  );
}

export function handleRouteError(err: unknown, isAdminRoute = false): NextResponse {
  if (err instanceof RateLimitError) {
    return jsonError(429, err.code, err.message, {
      "Retry-After": String(err.retryAfterSeconds),
    });
  }
  if (err instanceof QuotaExceededError) {
    return jsonError(429, err.code, err.message);
  }
  if (err instanceof AuthError) {
    return jsonError(err.status, err.code, err.message);
  }
  if (err instanceof ExtractionError) {
    return jsonError(err.status, err.code, err.message);
  }
  if (err instanceof RagClientError) {
    return jsonError(
      err.status,
      err.code,
      isAdminRoute ? err.adminMessage : err.userMessage
    );
  }
  if (err instanceof ZodError) {
    const firstIssue = err.issues?.[0];
    const msg = firstIssue
      ? `${firstIssue.path.join(".") || "input"}: ${firstIssue.message}`
      : "Invalid request payload";
    return jsonError(400, "validation_error", msg);
  }
  return jsonError(500, "internal_error", "An unexpected internal error occurred.");
}
