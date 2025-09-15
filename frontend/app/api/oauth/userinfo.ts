import type { NextApiRequest, NextApiResponse } from "next";

const AIP_BASE = process.env.OIDC_PROVIDER!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const access_token = req.cookies.access_token;

  if (!access_token) {
    return res.status(401).json({ error: "Missing access token" });
  }

  const userRes = await fetch(`${AIP_BASE}/api/atprotocol/session`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const userData = await userRes.json();

  if (!userRes.ok) {
    return res.status(userRes.status).json(userData);
  }

  res.json(userData);
}
