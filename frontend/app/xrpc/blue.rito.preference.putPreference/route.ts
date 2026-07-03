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
  const existingPostToBookmark = await prisma.postToBookmark.findUnique({
    where: { sub: did },
  });
  const existingUserHandle = await prisma.userDidHandle.findUnique({
    where: { did },
    select: {
      unblur_moderation_categories: true,
      terms_notice_acknowledged_revision_date: true,
      privacy_notice_acknowledged_revision_date: true,
    },
  });

  const hasEnableAutoGenerateBookmark = Object.hasOwn(body, 'enableAutoGenerateBookmark');
  const enableAutoGenerateBookmark = hasEnableAutoGenerateBookmark
    ? Boolean(body.enableAutoGenerateBookmark)
    : Boolean(existingPostToBookmark);
  const lang = body.lang || existingPostToBookmark?.lang || 'ja'
  const unblurModerationCategories = Array.isArray(body.unblurModerationCategories)
    ? body.unblurModerationCategories
    : existingUserHandle?.unblur_moderation_categories || [];
  const termsNoticeAcknowledgedRevisionDate = typeof body.termsNoticeAcknowledgedRevisionDate === 'string'
    ? body.termsNoticeAcknowledgedRevisionDate
    : existingUserHandle?.terms_notice_acknowledged_revision_date || null;
  const privacyNoticeAcknowledgedRevisionDate = typeof body.privacyNoticeAcknowledgedRevisionDate === 'string'
    ? body.privacyNoticeAcknowledgedRevisionDate
    : existingUserHandle?.privacy_notice_acknowledged_revision_date || null;

  if (hasEnableAutoGenerateBookmark && enableAutoGenerateBookmark) {
    // true の場合は INSERT（存在しなければ作成）
    await prisma.postToBookmark.upsert({
      where: { sub: did },
      update: { lang },
      create: { sub: did, lang }
    })
  } else if (hasEnableAutoGenerateBookmark) {
    // false の場合は DELETE（存在すれば削除）
    await prisma.postToBookmark.deleteMany({
      where: { sub: did }
    })
  }
  
  await prisma.userDidHandle.upsert({
    where: { did },
    update: {
      unblur_moderation_categories: unblurModerationCategories,
      terms_notice_acknowledged_revision_date: termsNoticeAcknowledgedRevisionDate,
      privacy_notice_acknowledged_revision_date: privacyNoticeAcknowledgedRevisionDate,
    },
    create: {
      did,
      unblur_moderation_categories: unblurModerationCategories,
      terms_notice_acknowledged_revision_date: termsNoticeAcknowledgedRevisionDate,
      privacy_notice_acknowledged_revision_date: privacyNoticeAcknowledgedRevisionDate,
    }
  })

  // 結果として enableAutoGenerateBookmark の状態を返す
  return NextResponse.json({
    enableAutoGenerateBookmark,
    unblurModerationCategories,
    termsNoticeAcknowledgedRevisionDate: termsNoticeAcknowledgedRevisionDate || '',
    privacyNoticeAcknowledgedRevisionDate: privacyNoticeAcknowledgedRevisionDate || '',
  }, { status: 200 })
}
