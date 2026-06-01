/**
 * Debug check classification helpers.
 *
 * Pure functions extracted from app/debug/page.tsx for testability.
 * No UI dependencies, no React hooks.
 */

export type CheckLevel = "success" | "warning" | "optional" | "failed";

export interface CheckInput {
  ok: boolean;
  optional?: boolean;
  warning?: boolean;
  name?: string;
  detail?: string;
}

export interface CheckOutput {
  name: string;
  level: CheckLevel;
  detail?: string;
}

export type HealthStatus = "healthy" | "warning" | "needs_attention";

/**
 * Map an API check response to its CheckLevel.
 */
export function classifyDebugCheck(ok: boolean, optional: boolean, warning: boolean): CheckLevel {
  if (ok) return "success";
  if (warning) return "warning";
  if (optional) return "optional";
  return "failed";
}

/**
 * Normalize raw API check array to CheckOutput[].
 * Handles the old format { ok, optional } and the new format { level }.
 */
export function normalizeChecks(rawChecks: Array<Record<string, unknown>>): CheckOutput[] {
  return rawChecks.map((c) => {
    // If the API already sends a "level" field, trust it
    if (c.level && ["success", "warning", "optional", "failed"].includes(c.level as string)) {
      return {
        name: String(c.name || "未知"),
        level: c.level as CheckLevel,
        detail: typeof c.detail === "string" ? c.detail : undefined,
      };
    }
    // Derive level from ok/optional flags
    const ok = Boolean(c.ok);
    const optional = Boolean(c.optional);
    const warning = Boolean(c.warning || c.level === "warning");
    const level = classifyDebugCheck(ok, optional, warning);
    return {
      name: String(c.name || "未知"),
      level,
      detail: typeof c.detail === "string" ? c.detail : undefined,
    };
  });
}

/**
 * Summarize overall health from a list of checks.
 * - failed > 0  → "needs_attention"
 * - warning > 0 → "warning"
 * - else        → "healthy"
 */
export function summarizeDebugHealth(checks: Array<{ level: CheckLevel }>): HealthStatus {
  const failed = checks.filter((c) => c.level === "failed").length;
  const warning = checks.filter((c) => c.level === "warning").length;
  if (failed > 0) return "needs_attention";
  if (warning > 0) return "warning";
  return "healthy";
}

function getLevelLabel(level: CheckLevel): string {
  switch (level) {
    case "success": return "通过";
    case "warning": return "警告";
    case "optional": return "可选";
    case "failed": return "失败";
  }
}

/**
 * Format a diagnostic report as plain text suitable for clipboard copy.
 * Does not expose secrets — detail strings are expected to be pre-sanitized
 * by the API (e.g. "found (hidden)" for keys).
 */
export function formatDebugCopyText(
  checks: CheckOutput[],
  clientInfo: { env: string; userAgent: string; storage: boolean; keyCount: number },
  fetchError?: { status?: number; statusText?: string; message?: string } | null
): string {
  const lines: string[] = [];
  lines.push("=== Bristol Care Diagnostics ===");
  lines.push(`Time: ${new Date().toLocaleString("zh-CN")}`);
  lines.push(`Env: ${clientInfo.env}`);
  lines.push(`UserAgent: ${clientInfo.userAgent}`);
  lines.push(`localStorage: ${clientInfo.storage ? "available" : "unavailable"} (${clientInfo.keyCount} keys)`);
  lines.push("");

  if (fetchError) {
    lines.push("--- Fetch Error ---");
    if (fetchError.status) lines.push(`Status: ${fetchError.status} ${fetchError.statusText || ""}`);
    if (fetchError.message) lines.push(`Message: ${fetchError.message}`);
    lines.push("");
  }

  if (checks.length) {
    const failed = checks.filter((c) => c.level === "failed").length;
    const warning = checks.filter((c) => c.level === "warning").length;
    const optional = checks.filter((c) => c.level === "optional").length;
    const success = checks.filter((c) => c.level === "success").length;
    const health = summarizeDebugHealth(checks);
    const healthLabel = health === "needs_attention" ? "需要关注" : health === "warning" ? "有警告" : "健康";
    lines.push(`--- Health: ${healthLabel} ---`);
    lines.push(`Checks: ${success} success${failed ? `, ${failed} failed` : ""}${warning ? `, ${warning} warning` : ""}${optional ? `, ${optional} optional` : ""}`);
    // Sort: failed first
    const order: Record<CheckLevel, number> = { failed: 0, warning: 1, optional: 2, success: 3 };
    const sorted = [...checks].sort((a, b) => (order[a.level] ?? 4) - (order[b.level] ?? 4));
    for (const check of sorted) {
      lines.push(`[${getLevelLabel(check.level).toUpperCase()}] ${check.name}${check.detail ? " - " + check.detail : ""}`);
    }
  }

  return lines.join("\n");
}