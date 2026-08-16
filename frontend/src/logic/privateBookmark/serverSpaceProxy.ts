import { NextRequest, NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { getOAuthClient, verifySignedDid } from "@/logic/HandleOauthClientNode";

export interface ProxyXrpcOptions {
  method: string;
  type: "query" | "procedure";
  validateParams?: (params: Record<string, string>, authDid: string) => boolean | string;
  validateBody?: (body: any, authDid: string) => boolean | string;
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
    const agent = new Agent(session);

    let result: any;

    if (options.type === "query") {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      if (options.validateParams) {
        const valErr = options.validateParams(searchParams, did);
        if (typeof valErr === "string") {
          return NextResponse.json({ error: "InvalidRequest", message: valErr }, { status: 400 });
        }
      }
      result = await agent.call(options.method, searchParams);
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
      result = await agent.call(options.method, undefined, body);
    }

    const response = NextResponse.json(result.data, {
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
    const status =
      err?.status ||
      err?.statusCode ||
      (err?.message?.includes("NotFound") || err?.error === "SpaceNotFound" ? 404 : 500);

    const message = err?.message || err?.error || "Space XRPC call failed";
    return NextResponse.json(
      { error: err?.error || "SpaceError", message },
      {
        status: typeof status === "number" && status >= 400 && status < 600 ? status : 500,
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
