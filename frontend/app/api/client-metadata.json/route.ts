import { NextResponse } from 'next/server';
import { client } from "@/logic/HandleOauthClientNode";

export async function GET() {

    return NextResponse.json(client.clientMetadata);
}