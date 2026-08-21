import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'NotFound' },
    { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
