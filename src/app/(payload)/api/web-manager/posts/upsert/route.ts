import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebManagerRequest,
  buildDefaultPostContent,
  normalizePostInput,
  type WebManagerPostUpsertInput,
} from '@/utilities/web-manager'

export async function POST(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  let body: WebManagerPostUpsertInput

  try {
    body = (await request.json()) as WebManagerPostUpsertInput
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  let input: ReturnType<typeof normalizePostInput>

  try {
    input = normalizePostInput(body)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid post payload.' },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config: configPromise })

  let existing = null

  if (input.id !== undefined) {
    try {
      existing = await payload.findByID({
        collection: 'posts',
        id: input.id,
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      existing = null
    }
  } else if (input.slug) {
    existing = (
      await payload.find({
        collection: 'posts',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          slug: {
            equals: input.slug,
          },
        },
      })
    ).docs[0]
  }

  const data: Record<string, unknown> = {
    title: input.title || existing?.title,
    slug: input.slug || existing?.slug,
    content: input.content || existing?.content || buildDefaultPostContent(input.title),
    ...(input.heroImage !== undefined ? { heroImage: input.heroImage } : {}),
    ...(input.categories ? { categories: input.categories } : {}),
    ...(input.relatedPosts ? { relatedPosts: input.relatedPosts } : {}),
    ...(input.authors ? { authors: input.authors } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
    _status: input._status,
  }

  const result = existing
    ? await payload.update({
        collection: 'posts',
        id: existing.id,
        data: data as any,
        depth: 0,
        overrideAccess: true,
      })
    : await payload.create({
        collection: 'posts',
        data: data as any,
        depth: 0,
        overrideAccess: true,
      })

  payload.logger.info(
    `[web-manager] post ${existing ? 'updated' : 'created'} slug=${result.slug} status=${result._status} ip=${auth.clientIp || 'unknown'}`,
  )

  return NextResponse.json({
    ok: true,
    action: existing ? 'updated' : 'created',
    post: {
      id: result.id,
      title: result.title,
      slug: result.slug,
      status: result._status,
      path: result.slug ? `/posts/${result.slug}` : null,
      updatedAt: result.updatedAt,
    },
  })
}
