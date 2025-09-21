import { isBlocked } from "@/logic/HandleBlocklist";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json({ error: "domain parameter is required" }, { status: 400 });
    }

    return NextResponse.json({ result: isBlocked(domain || '') });
}