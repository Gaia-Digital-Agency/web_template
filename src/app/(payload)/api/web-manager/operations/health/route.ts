import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { authorizeWebManagerRequest, getWebManagerScope } from '@/utilities/web-manager'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    limit: 1,
    overrideAccess: true,
    pagination: true,
  })

  return NextResponse.json({
    ok: true,
    service: 'web-manager-v1',
    serverUrl: getServerSideURL(),
    environment: process.env.NODE_ENV || 'development',
    scope: getWebManagerScope(),
    checks: {
      auth: 'ok',
      cms: 'ok',
      database: 'ok',
    },
    metrics: {
      uptimeSeconds: Math.round(process.uptime()),
      pageCount: pages.totalDocs,
    },
  })
}
