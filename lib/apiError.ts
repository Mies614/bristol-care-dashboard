/**
 * Safe API error diagnostic layer.
 *
 * ONLY Supabase code/message/details/hint are exposed — these are diagnostic
 * fields and never contain secrets. All other fields (service_role_key, anon
 * key, tokens, endpoints) are stripped before serialization.
 */

export type SafeApiErrorReason =
  | "permission_denied"
  | "rls_denied"
  | "missing_column"
  | "relation_missing"
  | "check_constraint_failed"
  | "unique_constraint_failed"
  | "missing_required_field"
  | "unknown_supabase_error";

/** Known Postgres error codes we map to human-readable reasons. */
const POSTGRES_ERROR_MAP: Record<string, SafeApiErrorReason> = {
  "42501": "permission_denied", // insufficient_privilege
  "42P01": "relation_missing", // undefined_table
  "42703": "missing_column", // undefined_column
  "23514": "check_constraint_failed", // check_violation
  "23505": "unique_constraint_failed", // unique_violation
  "23502": "missing_required_field", // not_null_violation
};

/**
 * Extract a Supabase error code string from any error shape.
 * Supabase JS v2 errors may expose .code, .details, .hint, .message directly
 * or nested inside .error (PostgrestError).
 */
function extractSupabaseErrorFields(error: unknown): {
  supabaseCode?: string;
  supabaseMessage?: string;
  supabaseDetails?: string;
  supabaseHint?: string;
} {
  if (!error || typeof error !== "object") return {};

  const err = error as Record<string, unknown>;

  // Direct PostgrestError shape
  const code = typeof err.code === "string" ? err.code : undefined;
  const message = typeof err.message === "string" ? err.message : undefined;
  const details = typeof err.details === "string" ? err.details : undefined;
  const hint = typeof err.hint === "string" ? err.hint : undefined;

  // Some shapes nest inside .error
  if (!code && err.error && typeof err.error === "object") {
    const inner = err.error as Record<string, unknown>;
    return extractSupabaseErrorFields(inner);
  }

  return {
    supabaseCode: code,
    supabaseMessage: message,
    supabaseDetails: details,
    supabaseHint: hint,
  };
}

/**
 * Given a Supabase error, strip secret fields and return sanitized fields.
 * This is safe to return in an API response body.
 */
function sanitizeErrorFields(error: unknown): {
  supabaseCode?: string;
  supabaseMessage?: string;
  supabaseDetails?: string;
  supabaseHint?: string;
} {
  const fields = extractSupabaseErrorFields(error);
  // If the message accidentally contains a secret key value, mask it
  if (fields.supabaseMessage) {
    // We don't have the actual secret values here to compare, but we can
    // strip anything that looks like a JWT or long base64 key
    fields.supabaseMessage = fields.supabaseMessage
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[JWT]")
      .replace(/[A-Za-z0-9+/=]{40,}/g, "[KEY]");
  }
  return fields;
}

/**
 * Classify a Supabase error into a SafeApiErrorReason.
 */
export function classifySupabaseError(error: unknown): SafeApiErrorReason {
  const { supabaseCode } = extractSupabaseErrorFields(error);
  if (supabaseCode && POSTGRES_ERROR_MAP[supabaseCode]) {
    return POSTGRES_ERROR_MAP[supabaseCode];
  }

  const message = typeof error === "object" && error !== null
    ? (error as Record<string, unknown>).message as string | undefined
    : undefined;

  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes("permission denied") || lower.includes("rls")) return "rls_denied";
    if (lower.includes("does not exist") || lower.includes("relation") || lower.includes("table")) return "relation_missing";
    if (lower.includes("column") || lower.includes("field")) return "missing_column";
    if (lower.includes("constraint")) {
      if (lower.includes("unique")) return "unique_constraint_failed";
      if (lower.includes("check") || lower.includes("violation")) return "check_constraint_failed";
    }
  }

  return "unknown_supabase_error";
}

/**
 * Convert any error into a safe API error payload.
 *
 * Only Supabase diagnostic fields (code/message/details/hint) are returned.
 * Never exposes secrets, tokens, keys or endpoints.
 */
export function toSafeApiError(
  error: unknown,
  fallbackCode: string,
): {
  ok: false;
  code: string;
  reason: SafeApiErrorReason;
  supabaseCode?: string;
  supabaseMessage?: string;
  supabaseDetails?: string;
  supabaseHint?: string;
} {
  const reason = classifySupabaseError(error);
  const fields = sanitizeErrorFields(error);

  return {
    ok: false,
    code: fallbackCode,
    reason,
    ...fields,
  };
}