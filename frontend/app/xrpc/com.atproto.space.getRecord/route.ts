import { NextRequest } from "next/server";
import { proxySpaceXrpc } from "@/logic/privateBookmark/serverSpaceProxy";

export async function GET(req: NextRequest) {
  return proxySpaceXrpc(req, {
    method: "com.atproto.space.getRecord",
    type: "query",
  });
}
