import "server-only";

import { getAuthenticatedRequestContext } from "./authenticatedRequestContext";
import { getAuthEnforcementMode } from "./productionAuthGuard";
import { resolveRequestContext } from "./requestContext";

export type ApiAuthContext = {
  spaceCode: string;
  spaceId: string;
  identity: string;
  role: "owner" | "partner";
  userId?: string;
};

type ResolvedAuth =
  | { ok: true; context: ApiAuthContext }
  | { ok: false; response: Response };

/**
 * Resolve the API auth context. In observe/enforce mode, uses real auth from
 * Supabase session + space_members. In off mode, falls back to the old
 * path-based resolveRequestContext for backward compatibility.
 */
export async function resolveApiAuth(
  request: Request,
  body?: Record<string, unknown>,
  requireOrigin = true,
): Promise<ResolvedAuth> {
  const mode = getAuthEnforcementMode();

  if (mode === "off") {
    const ctx = resolveRequestContext(request, body, { requireOrigin });
    if (!ctx.ok) return { ok: false, response: ctx.response };
    return {
      ok: true,
      context: {
        spaceCode: ctx.context.spaceCode,
        spaceId: "",
        identity: ctx.context.identity,
        role: ctx.context.side === "owner" ? "owner" : "partner",
      },
    };
  }

  const auth = await getAuthenticatedRequestContext();
  if (!auth.ok) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ ok: false, error: auth.error, code: auth.code }),
        { status: auth.status, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return {
    ok: true,
    context: {
      spaceCode: auth.context.spaceCode,
      spaceId: auth.context.spaceId,
      identity: auth.context.identityId,
      role: auth.context.role,
      userId: auth.context.userId,
    },
  };
}
