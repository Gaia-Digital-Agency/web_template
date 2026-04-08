import { NextRequest, NextResponse } from 'next/server'

import { authorizeWebManagerRequest, getWebManagerScope } from '@/utilities/web-manager'

export async function GET(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

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
    scope: getWebManagerScope(),
  })
}

export const POST = GET
