const AIP_BASE = process.env.OIDC_PROVIDER!;
const CLIENT_ID = process.env.RITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.RITO_CLIENT_SECRET!;
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 1日
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 365; // 365日

// リフレッシュトークンでアクセストークンを更新
export async function refreshAccessToken(refreshToken: string) {
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${AIP_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(JSON.stringify(errorData));
  }

  return res.json();
}

// リクエストからアクセストークンを取得し、必要ならリフレッシュ
export async function getAccessToken(
  req: Request | { cookies: Map<string, string> | { get: (key: string) => { value?: string } } },
  forceRefresh: boolean = false
) {
  let accessToken: string | undefined = (req as any).cookies.get?.(ACCESS_TOKEN_COOKIE)?.value;
  let refreshToken: string | undefined = (req as any).cookies.get?.(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return { accessToken: null, refreshToken: null, updatedCookies: null };
  }

  let updatedCookies: { key: string; value: string; maxAge: number }[] = [];

  // forceRefresh が true またはアクセストークンがない場合にリフレッシュ
  if ((forceRefresh || !accessToken) && refreshToken) {
    const tokenData = await refreshAccessToken(refreshToken);
    accessToken = tokenData.access_token;
    refreshToken = tokenData.refresh_token; // 新しいリフレッシュトークンも更新

    updatedCookies.push(
      { key: ACCESS_TOKEN_COOKIE, value: tokenData.access_token, maxAge: ACCESS_TOKEN_MAX_AGE },
      { key: REFRESH_TOKEN_COOKIE, value: tokenData.refresh_token, maxAge: REFRESH_TOKEN_MAX_AGE }
    );
  }

  return { accessToken, refreshToken, updatedCookies };
}
