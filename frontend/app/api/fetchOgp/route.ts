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
    const data = await ogs({
      url,
      fetchOptions: {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
      },
    });

    if (data.result) {
      if (data.result.ogTitle) data.result.ogTitle = data.result.ogTitle.slice(0, 255);
      if (data.result.ogDescription) data.result.ogDescription = data.result.ogDescription.slice(0, 255);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
