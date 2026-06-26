import "server-only";

import { createSupabaseServerClient as createServiceRoleClient } from "@/lib/supabase/server";
import { createAuthClient } from "@/lib/supabase/server";

export type AuthenticatedContext = {
  userId: string;
  email: string;
  spaceId: string;
  spaceCode: string;
  role: "owner" | "partner";
  identityId: string;
};

type AuthResult =
  | { ok: true; context: AuthenticatedContext }
  | { ok: false; status: number; code: string; error: string };

/**
 * Resolve the authenticated user context from the current Supabase session.
 *
 * This is the TRUSTED identity source — it queries auth.uid() and
 * space_members, and does NOT trust any client-sent identity/role/spaceCode.
 *
 * In AUTH_ENFORCEMENT_MODE=off, returns a fallback context for backward compat.
 * In observe/enforce mode, requires real session + membership.
 */
export async function getAuthenticatedRequestContext(): Promise<AuthResult> {
  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";

  if (mode === "off") {
    // Legacy mode: no real auth, return fallback
    return {
      ok: true,
      context: {
        userId: "00000000-0000-0000-0000-000000000000",
        email: "",
        spaceId: "",
        spaceCode: process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "xiaoguai520",
        role: "partner",
        identityId: "xiaoguai",
      },
    };
  }

  try {
    const authClient = await createAuthClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return {
        ok: false,
        status: 401,
        code: "UNAUTHENTICATED",
        error: "Authentication required.",
      };
    }

    // Look up space membership
    const serviceClient = createServiceRoleClient();
    const { data: member, error: memberError } = await serviceClient
      .from("space_members")
      .select("space_id, role, identity_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !member) {
      return {
        ok: false,
        status: 403,
        code: "NO_MEMBERSHIP",
        error: "No space membership found.",
      };
    }

    // Get space code
    const { data: space } = await serviceClient
      .from("couple_spaces")
      .select("code")
      .eq("id", member.space_id)
      .maybeSingle();

    return {
      ok: true,
      context: {
        userId: user.id,
        email: user.email || "",
        spaceId: member.space_id as string,
        spaceCode: space?.code as string || "",
        role: member.role as "owner" | "partner",
        identityId: member.identity_id as string,
      },
    };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "AUTH_CONTEXT_FAILED",
      error: "Failed to resolve authentication context.",
    };
  }
}

/**
 * Require authenticated user with space membership.
 * Returns 401/403 error responses if not authenticated.
 */
export async function requireAuth(): Promise<
  { ok: true; context: AuthenticatedContext } | { ok: false; response: Response }
> {
  const result = await getAuthenticatedRequestContext();
  if (!result.ok) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: result.error, code: result.code }),
        {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }
  return { ok: true, context: result.context };
}

/**
 * Require a specific role (owner or partner).
 */
export async function requireRole(
  required: "owner" | "partner",
): Promise<
  { ok: true; context: AuthenticatedContext } | { ok: false; response: Response }
> {
  const result = await requireAuth();
  if (!result.ok) return result;

  if (result.context.role !== required) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          ok: false,
          error: "Insufficient permissions.",
          code: "FORBIDDEN_ROLE",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    };
  }

  return result;
}
