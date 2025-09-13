import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle");

  if (!handle) {
      return NextResponse.json({ error: "handle parameter is required" }, { status: 400 });
  }

  try {
    const url = new URL("/.well-known/atproto-did", `https://${handle}`);
    const response = await fetch(url, { redirect: "error" });

    if (!response.ok) {
      return NextResponse.json({ error: "Domain is unreachable" }, { status: 502 });
    }

    const text = await response.text();
    const did = text.split("\n")[0]!.trim();

    return NextResponse.json({ did });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
