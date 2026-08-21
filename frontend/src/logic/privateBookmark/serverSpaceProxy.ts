import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, verifySignedDid } from "@/logic/HandleOauthClientNode";

const SPACE_TYPE = "blue.rito.space.bookmark";
const SPACE_KEY = "self";
const COLLECTION = "blue.rito.private.feed.bookmark";

export interface ProxyXrpcOptions {
  method: string;
  type: "query" | "procedure";
}

function getExpectedSpaceUri(did: string): string {
  return `at://${did}/space/${SPACE_TYPE}/${SPACE_KEY}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function validateRkey(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 512 && /^[A-Za-z0-9._~:-]+$/.test(value);
}

function validateCommonRecordTarget(body: Record<string, unknown>, did: string): string | null {
  if (body.space !== getExpectedSpaceUri(did)) return "Invalid private bookmark space";
  if (body.repo !== did) return "Invalid private bookmark repo";
  if (body.collection !== COLLECTION) return "Invalid private bookmark collection";
  if (!validateRkey(body.rkey)) return "Invalid private bookmark record key";
  return null;
}

function validatePrivateBookmarkQuery(
  method: string,
  params: Record<string, string>,
  did: string,
): string | null {
  const expectedSpace = getExpectedSpaceUri(did);

  if (method === "com.atproto.space.getSpace" || method === "com.atproto.simplespace.getSpace") {
    if (Object.keys(params).some((key) => key !== "space") || params.space !== expectedSpace) {
      return "Invalid private bookmark space";
    }
    return null;
  }

  if (method === "com.atproto.space.listRecords") {
    if (!hasOnlyKeys(params, ["space", "repo", "collection", "limit", "cursor"])) {
      return "Unexpected private bookmark query parameter";
    }
    if (params.space !== expectedSpace || params.repo !== did || params.collection !== COLLECTION) {
      return "Invalid private bookmark target";
    }
    const limit = Number(params.limit || "30");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return "Invalid private bookmark limit";
    }
    if (params.cursor && params.cursor.length > 2048) {
      return "Invalid private bookmark cursor";
    }
    return null;
  }

  if (method === "com.atproto.space.getRecord") {
    if (!hasOnlyKeys(params, ["space", "repo", "collection", "rkey"])) {
      return "Unexpected private bookmark query parameter";
    }
    if (params.space !== expectedSpace || params.repo !== did || params.collection !== COLLECTION) {
      return "Invalid private bookmark target";
    }
    return validateRkey(params.rkey) ? null : "Invalid private bookmark record key";
  }

  return "Unsupported private bookmark query";
}

function validatePrivateBookmarkProcedure(
  method: string,
  input: unknown,
  did: string,
): string | null {
  if (!isRecord(input)) return "Invalid request body";

  if (method === "com.atproto.simplespace.createSpace") {
    if (!hasOnlyKeys(input, ["type", "skey", "policy", "appAccess"])) {
      return "Unexpected private bookmark space setting";
    }
    if (input.type !== SPACE_TYPE || input.skey !== SPACE_KEY) {
      return "Invalid private bookmark space setting";
    }
    if (
      !isRecord(input.policy) ||
      !hasOnlyKeys(input.policy, ["$type"]) ||
      getString(input.policy.$type) !== "com.atproto.simplespace.defs#memberListPolicy" ||
      !isRecord(input.appAccess) ||
      !hasOnlyKeys(input.appAccess, ["$type"]) ||
      getString(input.appAccess.$type) !== "com.atproto.simplespace.defs#open"
    ) {
      return "Invalid private bookmark access policy";
    }
    return null;
  }

  if (method === "com.atproto.simplespace.deleteSpace") {
    if (!hasOnlyKeys(input, ["space"])) {
      return "Unexpected private bookmark space field";
    }
    return input.space === getExpectedSpaceUri(did)
      ? null
      : "Invalid private bookmark space";
  }

  if (method === "com.atproto.space.createRecord" || method === "com.atproto.space.putRecord") {
    if (!hasOnlyKeys(input, ["space", "repo", "collection", "rkey", "record"])) {
      return "Unexpected private bookmark record field";
    }
    const targetError = validateCommonRecordTarget(input, did);
    if (targetError) return targetError;
    if (!isRecord(input.record) || input.record.$type !== COLLECTION) {
      return "Invalid private bookmark record type";
    }
    return null;
  }

  if (method === "com.atproto.space.deleteRecord") {
    if (!hasOnlyKeys(input, ["space", "repo", "collection", "rkey"])) {
      return "Unexpected private bookmark record field";
    }
    return validateCommonRecordTarget(input, did);
  }

  return "Unsupported private bookmark procedure";
}

/**
 * Proxy XRPC calls for Space & Permissioned Data to user's PDS via authenticated OAuth session.
 * Enforces:
 * - Session restoration from signed cookie DID
 * - Referer check
 * - Cache-Control: private, no-store
 * - Zero persistence / zero logging of private data
 */
export async function proxySpaceXrpc(req: NextRequest, options: ProxyXrpcOptions) {
  const referer = req.headers.get("referer");
  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const signedDid = req.cookies.get("USER_DID")?.value;
  if (!signedDid) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing session cookie" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const did = verifySignedDid(signedDid);
  if (!did) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid session signature" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // Enforce CSRF token verification for all mutating procedures
  if (options.type === "procedure") {
    const csrfCookie = req.cookies.get("CSRF_TOKEN")?.value;
    const csrfHeader = req.headers.get("x-csrf-token") || req.headers.get("X-CSRF-Token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json(
        { error: "Forbidden", message: "Invalid CSRF token" },
        { status: 403, headers: { "Cache-Control": "private, no-store" } }
      );
    }
  }

  try {
    const client = await getOAuthClient();
    const session = await client.restore(did);

    const pathname = `/xrpc/${options.method}`;
    const queryUrl = new URL(pathname, "http://localhost");

    if (options.type === "query") {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const validationError = validatePrivateBookmarkQuery(options.method, searchParams, did);
      if (validationError) {
        return NextResponse.json(
          { error: "InvalidRequest", message: validationError },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      for (const [k, v] of Object.entries(searchParams)) {
        queryUrl.searchParams.append(k, v);
      }
    }

    const requestPath = `${queryUrl.pathname}${queryUrl.search}`;
    const fetchFn =
      typeof (session as any).fetchHandler === "function"
        ? (session as any).fetchHandler.bind(session)
        : typeof (session as any).fetch === "function"
        ? (session as any).fetch.bind(session)
        : fetch;

    let fetchRes: Response;

    if (options.type === "query") {
      fetchRes = await fetchFn(requestPath, {
        method: "GET",
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } else {
      let body: unknown = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      const validationError = validatePrivateBookmarkProcedure(options.method, body, did);
      if (validationError) {
        return NextResponse.json(
          { error: "InvalidRequest", message: validationError },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      }
      fetchRes = await fetchFn(requestPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify(body),
      });
    }

    const responseData = await fetchRes.json().catch(() => ({}));

    if (!fetchRes.ok) {
      let errorCode = responseData.error || "SpaceError";
      let message = responseData.message || `PDS returned error (${fetchRes.status})`;

      if (fetchRes.status === 404 || responseData.error === "SpaceNotFound") {
        errorCode = "SpaceNotFound";
      }

      return NextResponse.json(
        { error: errorCode, message },
        {
          status: fetchRes.status >= 400 && fetchRes.status < 600 ? fetchRes.status : 500,
          headers: {
            "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          },
        }
      );
    }

    const response = NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    });

    if (options.type === "procedure") {
      response.cookies.delete({
        name: "CSRF_TOKEN",
        path: "/",
      });
    }

    return response;
  } catch (err: any) {
    let errorCode = err?.error || "SpaceError";
    let message = err?.message || err?.error || "Space XRPC call failed";
    let status =
      err?.status ||
      err?.statusCode ||
      (err?.message?.includes("NotFound") || err?.error === "SpaceNotFound" ? 404 : 500);

    const isSocketError =
      err?.code === "UND_ERR_SOCKET" ||
      err?.message?.includes("UND_ERR_SOCKET") ||
      err?.cause?.code === "UND_ERR_SOCKET" ||
      err?.message?.includes("other side closed");

    if (isSocketError) {
      errorCode = "PdsNotSupported";
      message = "PDS closed connection. Proposal 0016 (Space) is not yet supported on this PDS.";
      status = 501;
    }

    return NextResponse.json(
      { error: errorCode, message },
      {
        status: typeof status === "number" && status >= 400 && status < 600 ? status : 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
