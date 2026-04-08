import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebManagerRequest,
  buildDocumentPath,
  collectApprovalIssues,
  findManagedDocument,
  isSupportedManagedCollection,
  type WebManagerManagedCollection,
} from '@/utilities/web-manager'

type ApprovalBody = {
  collection: string
  id?: number | string
  slug?: string
}

export async function POST(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  let body: ApprovalBody

  try {
    body = (await request.json()) as ApprovalBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!body?.collection || typeof body.collection !== 'string' || !isSupportedManagedCollection(body.collection)) {
    return NextResponse.json({ ok: false, error: 'Unsupported `collection`.' }, { status: 400 })
  }

  if (body.id === undefined && !body.slug) {
    return NextResponse.json({ ok: false, error: 'Provide `id` or `slug`.' }, { status: 400 })
  }

  const collection = body.collection as WebManagerManagedCollection
  const payload = await getPayload({ config: configPromise })
  const existing = await findManagedDocument(payload, {
    collection,
    id: body.id,
    slug: body.slug,
  })

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 })
  }

  const issues = collectApprovalIssues({ collection, doc: existing })
  const path = buildDocumentPath({ collection, slug: existing.slug })

  return NextResponse.json({
    ok: true,
    collection,
    approval: {
      ready: issues.length === 0,
      issues,
      currentStatus: existing._status || 'draft',
      path,
      document: {
        id: existing.id,
        title: existing.title,
        slug: existing.slug,
        updatedAt: existing.updatedAt,
      },
    },
  })
}
