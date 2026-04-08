import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebManagerRequest,
  buildDocumentPath,
  collectApprovalIssues,
  defaultCollectionTags,
  findManagedDocument,
  isSupportedManagedCollection,
  type WebManagerManagedCollection,
} from '@/utilities/web-manager'

type PublishBundleBody = {
  collection: string
  id?: number | string
  slug?: string
  revalidatePath?: string
  revalidateTag?: string
}

export async function POST(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  let body: PublishBundleBody

  try {
    body = (await request.json()) as PublishBundleBody
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

  if (issues.length > 0) {
    return NextResponse.json(
      { ok: false, error: 'Document is not approval-ready.', issues },
      { status: 400 },
    )
  }

  const result = await payload.update({
    collection,
    id: existing.id,
    data: {
      _status: 'published',
      ...(existing.publishedAt ? {} : { publishedAt: new Date().toISOString() }),
    } as any,
    depth: 0,
    overrideAccess: true,
  })

  const documentPath = buildDocumentPath({ collection, slug: result.slug })
  const revalidatePathValue = body.revalidatePath?.trim() || documentPath
  const revalidateTagValue = body.revalidateTag?.trim() || defaultCollectionTags[collection]

  if (revalidatePathValue) {
    revalidatePath(revalidatePathValue)
  }

  if (revalidateTagValue) {
    revalidateTag(revalidateTagValue, 'max')
  }

  payload.logger.info(
    `[web-manager] publish-bundle collection=${collection} slug=${result.slug} ip=${auth.clientIp || 'unknown'}`,
  )

  return NextResponse.json({
    ok: true,
    action: 'publish-bundle',
    collection,
    approval: {
      ready: true,
      issues: [],
    },
    document: {
      id: result.id,
      title: result.title,
      slug: result.slug,
      status: result._status,
      path: documentPath,
      updatedAt: result.updatedAt,
    },
    revalidated: {
      path: revalidatePathValue || null,
      tag: revalidateTagValue || null,
    },
  })
}
