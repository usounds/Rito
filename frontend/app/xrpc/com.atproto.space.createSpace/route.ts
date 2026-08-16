import { NextRequest } from "next/server";
import { proxySpaceXrpc } from "@/logic/privateBookmark/serverSpaceProxy";

export async function POST(req: NextRequest) {
  return proxySpaceXrpc(req, {
    method: "com.atproto.space.createSpace",
    type: "procedure",
  });
}
