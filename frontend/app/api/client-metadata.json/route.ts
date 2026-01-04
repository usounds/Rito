import { NextResponse } from 'next/server';
import { getOAuthClient } from '@/logic/HandleOauthClientNode'

export async function GET() {
  const client = await getOAuthClient();

    return NextResponse.json(client.clientMetadata);
}