import { NextResponse } from 'next/server';
import { verifyJWT } from '@/logic/HandleJWT';
import { prisma } from '@/logic/HandlePrismaClient';

export async function GET(req: Request) {
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
        did = veriryed.payload.iss||''
        lxm = veriryed.payload.lxm||''
    } catch {
        return NextResponse.json({ message: 'Invalid JWT Token' }, { status: 403 });

    }

    if (!veriry || !did) {
        return NextResponse.json({ message: 'Invalid JWT Token' }, { status: 403 });
    }
    if (lxm !== 'blue.rito.preference.getPreference') {
        return NextResponse.json({ message: 'Invalid lxm' }, { status: 403 });
    }

  const record = await prisma.postToBookmark.findUnique({
    where: { sub: did },
  })

  // 存在すれば autoGenerateBookmark: true、なければ false
    return NextResponse.json({
    autoGenerateBookmark: !!record,
    langForAutoGenertateBookmark: record?.lang || 'ja'
  }, { status: 200 });


}