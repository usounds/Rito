import { NextResponse } from 'next/server';
import { verifyJWT } from '@/logic/HandleJWT';
import { prisma } from '@/logic/HandlePrismaClient';
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {

  const authorization = req.headers.get('Authorization') || ''
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization Header required. This api shoud be call via atproto-proxy.' }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_URL || ''
  const url = new URL(origin)
  const audience = `did:web:${url.hostname}`

  let veriry = false
  let did = ''
    let lxm = ''
  try {
    const veriryed = await verifyJWT(authorization, audience)

    veriry = veriryed.verified
    did = veriryed.payload.iss || ''
        lxm = veriryed.payload.lxm||''
  } catch {
    return NextResponse.json({ message: 'Invalid JWT Token' }, { status: 403 });

  }

  if (!veriry || !did) {
    return NextResponse.json({ message: 'Invalid JWT Token' }, { status: 403 });
  }
    if (lxm !== 'blue.rito.preference.putPreference') {
        return NextResponse.json({ message: 'Invalid lxm' }, { status: 403 });
    }


  // POST body の取得
  const body = await req.json()
  const autoGenerateBookmark = Boolean(body.autoGenerateBookmark)
  const lang = body.lang || 'ja'

  if (autoGenerateBookmark) {
    // true の場合は INSERT（存在しなければ作成）
    await prisma.postToBookmark.upsert({
      where: { sub: did },
      update: {lang},       // 既に存在していれば何もしない
      create: { sub: did }
    })
  } else {
    // false の場合は DELETE（存在すれば削除）
    await prisma.postToBookmark.deleteMany({
      where: { sub: did }
    })
  }

  // 結果として autoGenerateBookmark の状態を返す
  return NextResponse.json({
    autoGenerateBookmark
  }, { status: 200 })
}
