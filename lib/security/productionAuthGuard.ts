import "server-only";

/**
 * Production auth mode guard - prevents accidentally running
 * with AUTH_ENFORCEMENT_MODE=off in production.
 *
 * In development/test, "off" mode is allowed for local development.
 * In production, "off" mode throws at build/runtime to force
 * explicit configuration.
 */

export function getAuthEnforcementMode(): "off" | "observe" | "enforce" {
  const mode = (process.env.AUTH_ENFORCEMENT_MODE || "off") as string;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && mode === "off") {
    throw new Error(
      "AUTH_ENFORCEMENT_MODE=off is not allowed in production. " +
      "Use 'observe' for rollout or 'enforce' when fully deployed."
    );
  }

  if (mode === "off" || mode === "observe" || mode === "enforce") {
    return mode;
  }

  // Unknown mode - fail closed to observe
  return "observe";
}
