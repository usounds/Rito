// frontend/app/api/fetchOgp/route.ts
import { NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  try {
    const data = await ogs({ url });
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
