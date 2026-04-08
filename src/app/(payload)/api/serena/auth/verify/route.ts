import { NextRequest, NextResponse } from 'next/server'

import { authorizeSerenaRequest, getSerenaScope } from '@/utilities/serena'

export async function GET(request: NextRequest) {
  const auth = authorizeSerenaRequest(request)

  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: auth.error,
      },
      { status: auth.status },
    )
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    clientIp: auth.clientIp,
    scope: getSerenaScope(),
  })
}

export const POST = GET
