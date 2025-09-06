import { NextResponse } from "next/server";
import { isBlocked } from "@/logic/HandleBlocklist";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain");
    return NextResponse.json({ result: isBlocked(domain || '') });
}