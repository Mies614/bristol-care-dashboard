import { NextResponse } from "next/server";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { forbiddenOriginResponse, isAllowedOrigin, isServerToServer } from "@/lib/originGuard";
import { getDefaultSpaceCodeServer, normalizeSpaceCode } from "@/lib/spaceCode";

export type RequestSide = "owner" | "partner";
export type RequestIdentity = "me" | typeof DEFAULT_NORMAL_IDENTITY_ID;

export type RequestContext = {
  spaceCode: string;
  identity: RequestIdentity;
  side: RequestSide;
};

type RequestInput = {
  spaceCode?: unknown;
  code?: unknown;
  identity?: unknown;
  author?: unknown;
  createdBy?: unknown;
  role?: unknown;
  viewer?: unknown;
};

type ResolveOptions = {
  requireOrigin?: boolean;
  defaultSide?: RequestSide;
};

type ContextResult =
  | { ok: true; context: RequestContext }
  | { ok: false; response: Response };

const VALID_IDENTITIES = new Set<string>(["me", DEFAULT_NORMAL_IDENTITY_ID]);
const VALID_SIDES = new Set<RequestSide>(["owner", "partner"]);

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeJson(payload: Record<string, unknown>, status: number): Response {
  return NextResponse.json(payload, { status });
}

function getProvidedSpaceCode(request: Request, input?: RequestInput): string | undefined {
  return (
    asString(input?.spaceCode) ||
    asString(input?.code) ||
    asString(request.headers.get("x-space-code"))
  );
}

function getRefererSide(request: Request): RequestSide | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const pathname = new URL(referer).pathname;
    return pathname === "/me" || pathname.startsWith("/me/") ? "owner" : "partner";
  } catch {
    return null;
  }
}

function sideToIdentity(side: RequestSide): RequestIdentity {
  return side === "owner" ? "me" : DEFAULT_NORMAL_IDENTITY_ID;
}

function getSide(request: Request, input?: RequestInput, defaultSide: RequestSide = "partner"): RequestSide {
  const refererSide = getRefererSide(request);
  if (refererSide) return refererSide;

  const headerSide = asString(request.headers.get("x-app-side"));
  if (headerSide === "owner" || headerSide === "partner") return headerSide;

  const bodySide = asString((input as RequestInput & { side?: unknown } | undefined)?.side);
  if (bodySide === "owner" || bodySide === "partner") return bodySide;

  return VALID_SIDES.has(defaultSide) ? defaultSide : "partner";
}

function getProvidedIdentity(input?: RequestInput): string | undefined {
  return (
    asString(input?.identity) ||
    asString(input?.author) ||
    asString(input?.createdBy) ||
    asString(input?.viewer) ||
    asString(input?.role)
  );
}

export function resolveRequestContext(
  request: Request,
  input?: RequestInput,
  options: ResolveOptions = {},
): ContextResult {
  if (options.requireOrigin) {
    // Server-to-server calls (Cron, webhooks) bypass origin check
    if (!isServerToServer(request) && !isAllowedOrigin(request)) {
      return { ok: false, response: forbiddenOriginResponse() };
    }
  }

  const configuredSpaceCode = normalizeSpaceCode(getDefaultSpaceCodeServer());
  const providedSpaceCode = getProvidedSpaceCode(request, input);
  if (providedSpaceCode && normalizeSpaceCode(providedSpaceCode) !== configuredSpaceCode) {
    return {
      ok: false,
      response: safeJson(
        {
          ok: false,
          error: "空间不匹配。",
          code: "SPACE_CODE_FORBIDDEN",
        },
        403,
      ),
    };
  }

  const side = getSide(request, input, options.defaultSide);
  const identity = sideToIdentity(side);
  const providedIdentity = getProvidedIdentity(input);
  if (providedIdentity) {
    if (!VALID_IDENTITIES.has(providedIdentity) || providedIdentity !== identity) {
      return {
        ok: false,
        response: safeJson(
          {
            ok: false,
            error: "身份上下文不匹配。",
            code: "IDENTITY_CONTEXT_FORBIDDEN",
          },
          403,
        ),
      };
    }
  }

  return {
    ok: true,
    context: {
      spaceCode: configuredSpaceCode,
      identity,
      side,
    },
  };
}

export function requestContextResponse(result: ContextResult): Response | null {
  return result.ok ? null : result.response;
}
