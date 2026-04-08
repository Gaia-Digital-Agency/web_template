import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import {
  authorizeWebManagerRequest,
  buildDefaultPageLayout,
  buildDefaultPageHero,
  buildPagePath,
  normalizePageInput,
  type WebManagerPageUpsertInput,
} from '@/utilities/web-manager'

export async function POST(request: NextRequest) {
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

  let body: WebManagerPageUpsertInput

  try {
    body = (await request.json()) as WebManagerPageUpsertInput
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Request body must be valid JSON.',
      },
      { status: 400 },
    )
  }

  let input: ReturnType<typeof normalizePageInput>

  try {
    input = normalizePageInput(body)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid page payload.',
      },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config: configPromise })

  let existing = null

  if (input.id !== undefined) {
    try {
      existing = await payload.findByID({
        collection: 'pages',
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
        collection: 'pages',
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
    ...(input.hero ? { hero: input.hero } : existing?.hero ? { hero: existing.hero } : { hero: buildDefaultPageHero(input.title) }),
    ...(input.layout
      ? { layout: input.layout }
      : existing?.layout
        ? { layout: existing.layout }
        : { layout: buildDefaultPageLayout(input.title) }),
    ...(input.meta ? { meta: input.meta } : {}),
    ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
    _status: input._status,
  }

  const result = existing
    ? await payload.update({
        collection: 'pages',
        id: existing.id,
        data: data as any,
        depth: 0,
        overrideAccess: true,
      })
    : await payload.create({
        collection: 'pages',
        data: data as any,
        depth: 0,
        overrideAccess: true,
      })

  if (!result.slug) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Page was saved but no slug was returned.',
      },
      { status: 500 },
    )
  }

  const path = buildPagePath(result.slug)

  payload.logger.info(
    `[web-manager] page ${existing ? 'updated' : 'created'} slug=${result.slug} status=${result._status} ip=${auth.clientIp || 'unknown'}`,
  )

  return NextResponse.json({
    ok: true,
    action: existing ? 'updated' : 'created',
    page: {
      id: result.id,
      title: result.title,
      slug: result.slug,
      status: result._status,
      path,
      updatedAt: result.updatedAt,
    },
  })
}
