// app/xrpc/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/logic/HandleOauth";
import * as jose from "jose";
import { createHash } from "crypto";


interface AtpSessionResponse {
  did: string;
  handle: string;
  access_token: string;
  token_type: string;
  scopes: string[];
  pds_endpoint: string;
  dpop_jwk: ParsedDPoPKey;
  expires_at: string;
}

interface ParsedDPoPKey {
  kty: string;
  crv: string;
  x: string;
  y: string;
  d: string;
}

async function generateDPoPProof(
  method: string,
  url: string,
  dpopJwk: ParsedDPoPKey,
  access_token: string,
  dpopNonce?: string,
) {
  // 秘密鍵インポート
  const key = await jose.importJWK({ ...dpopJwk, alg: "ES256", use: "sig" }, "ES256");

  // 公開鍵抽出
  const { d, ...publicJwk } = dpopJwk;

  // URL 正規化（末尾スラッシュを削除）
  const normalizedUrl = url; // そのまま

  const payload: Record<string, any> = {
    htm: method.toUpperCase(),
    htu: normalizedUrl,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
    ath: createHash('sha256').update(access_token).digest('base64url'),
    ...(dpopNonce ? { nonce: dpopNonce } : {}),
  };
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: publicJwk })
    .sign(key);
}

const AIP_BASE_URL = process.env.OIDC_PROVIDER!;

export async function POST(req: NextRequest) {
  const { accessToken, updatedCookies } = await getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const res = NextResponse.next();
  if (updatedCookies) {
    updatedCookies.forEach(c =>
      res.cookies.set(c.key, c.value, { httpOnly: true, path: "/", sameSite: "lax", maxAge: c.maxAge })
    );
  }

  try {
    const sessionRes = await fetch(`${AIP_BASE_URL}/api/atprotocol/session`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!sessionRes.ok) {
      const text = await sessionRes.text();
      return NextResponse.json({ success: false, error: `Failed to get session: ${text}` }, { status: sessionRes.status });
    }

    const session: AtpSessionResponse = await sessionRes.json();
    if (!session.dpop_jwk?.d) {
      return NextResponse.json({ success: false, error: "DPoP key missing private component" }, { status: 500 });
    }

    const xrpcUrl = `${session.pds_endpoint.replace(/\/+$/, "")}${req.nextUrl.pathname}${req.nextUrl.search}`;
    const body = await req.json();

    // 初回 DPoP proof 生成
    let dpopProof = await generateDPoPProof("POST", xrpcUrl, session.dpop_jwk, session.access_token, undefined);

    let headers = {
      Authorization: `DPoP ${session.access_token}`, // ← Bearer → DPoP
      DPoP: dpopProof,
      "Content-Type": "application/json",
    };

    let pdsRes = await fetch(xrpcUrl, { method: "POST", headers, body: JSON.stringify(body) });

    // 401 + dpop-nonce が返ってきた場合は nonce 再送
    if (pdsRes.status === 401) {
      const nonce = pdsRes.headers.get("dpop-nonce");
      if (nonce) {
        dpopProof = await generateDPoPProof("POST", xrpcUrl, session.dpop_jwk, session.access_token, nonce);
        headers.DPoP = dpopProof;
        pdsRes = await fetch(xrpcUrl, { method: "POST", headers, body: JSON.stringify(body) });
      }
    }

    let data: any;
    try { data = await pdsRes.json(); } catch { data = { error: "Failed to parse response" }; }



        const response = NextResponse.json({
      success: pdsRes.ok,
      status: pdsRes.status,
      data,
      error: pdsRes.ok ? undefined : "XRPC call failed",
    }, { status: pdsRes.status });


    if (updatedCookies) {
      updatedCookies.forEach((c) =>
        response.cookies.set(c.key, c.value, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          maxAge: c.maxAge,
        })
      );
    }

    return response

  } catch (err: any) {
    return NextResponse.json({ success: false, error: `Internal server error: ${err.message || err}` }, { status: 500 });
  }
}
