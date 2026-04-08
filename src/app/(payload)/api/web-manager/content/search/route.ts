import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebManagerRequest,
  buildDocumentPath,
  supportedManagedCollections,
} from '@/utilities/web-manager'

export async function GET(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const query = request.nextUrl.searchParams.get('q')?.trim()
  const limit = Number(request.nextUrl.searchParams.get('limit') || '5')

  if (!query) {
    return NextResponse.json({ ok: false, error: 'Query param `q` is required.' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const collections = [...supportedManagedCollections]

  const results = await Promise.all(
    collections.map(async (collection) => {
      const response = await payload.find({
        collection,
        depth: 0,
        draft: true,
        limit,
        overrideAccess: true,
        pagination: false,
        where: {
          or: [
            { title: { like: query } },
            { slug: { like: query } },
          ],
        },
      })

      return response.docs.map((doc: any) => ({
        collection,
        id: doc.id,
        title: doc.title,
        slug: doc.slug,
        status: doc._status || 'draft',
        path: buildDocumentPath({ collection, slug: doc.slug }),
        updatedAt: doc.updatedAt,
      }))
    }),
  )

  return NextResponse.json({
    ok: true,
    query,
    results: results.flat(),
  })
}
