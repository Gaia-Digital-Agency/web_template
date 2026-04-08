import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { authorizeSerenaRequest, getSerenaScope } from '@/utilities/serena'
import { getServerSideURL } from '@/utilities/getURL'

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

  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    limit: 1,
    overrideAccess: true,
    pagination: true,
  })

  return NextResponse.json({
    ok: true,
    service: 'serena-v1',
    scope: getSerenaScope(),
    serverUrl: getServerSideURL(),
    basePath: '/template',
    environment: process.env.NODE_ENV || 'development',
    collections: {
      pages: {
        total: pages.totalDocs,
      },
    },
    features: {
      pageUpsert: true,
      revalidate: true,
    },
  })
}
