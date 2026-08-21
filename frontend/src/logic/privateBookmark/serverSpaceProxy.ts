import { NextRequest, NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { getOAuthClient, verifySignedDid } from "@/logic/HandleOauthClientNode";

export interface ProxyXrpcOptions {
  method: string;
  type: "query" | "procedure";
  validateParams?: (params: Record<string, string>, authDid: string) => boolean | string;
  validateBody?: (body: any, authDid: string) => boolean | string;
}

const SPACE_LEXICONS = [
  {
    lex: 1,
    id: "com.atproto.space.getSpace",
    defs: { main: { type: "query" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.listRecords",
    defs: { main: { type: "query" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.getRecord",
    defs: { main: { type: "query" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.createRecord",
    defs: { main: { type: "procedure" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.putRecord",
    defs: { main: { type: "procedure" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.deleteRecord",
    defs: { main: { type: "procedure" } },
  },
  {
    lex: 1,
    id: "com.atproto.space.createSpace",
    defs: { main: { type: "procedure" } },
  },
  {
    lex: 1,
    id: "com.atproto.simplespace.createSpace",
    defs: { main: { type: "procedure" } },
  },
  {
    lex: 1,
    id: "com.atproto.simplespace.listMembers",
    defs: { main: { type: "query" } },
  },
];

function ensureSpaceLexicons(agent: Agent) {
  const lexicons = (agent as any).lex || (agent as any).xrpc?.lex;
  if (!lexicons) return;

  for (const doc of SPACE_LEXICONS) {
    try {
      if (!lexicons.get?.(doc.id)) {
        lexicons.add(doc);
      }
    } catch {}
  }
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
      if (options.validateParams) {
        const valErr = options.validateParams(searchParams, did);
        if (typeof valErr === "string") {
          return NextResponse.json({ error: "InvalidRequest", message: valErr }, { status: 400 });
        }
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
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      if (options.validateBody) {
        const valErr = options.validateBody(body, did);
        if (typeof valErr === "string") {
          return NextResponse.json({ error: "InvalidRequest", message: valErr }, { status: 400 });
        }
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
