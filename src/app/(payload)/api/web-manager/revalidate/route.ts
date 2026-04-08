import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

import { authorizeWebManagerRequest, buildPagePath } from '@/utilities/web-manager'

type RevalidateRequestBody = {
  path?: string
  slug?: string
  tag?: string
}

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

  let body: RevalidateRequestBody

  try {
    body = (await request.json()) as RevalidateRequestBody
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Request body must be valid JSON.',
      },
      { status: 400 },
    )
  }

  const slug = body.slug?.trim()
  const path = body.path?.trim() || (slug ? buildPagePath(slug) : '')
  const tag = body.tag?.trim()

  if (!path && !tag) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Provide at least one of `path`, `slug`, or `tag`.',
      },
      { status: 400 },
    )
  }

  if (path) {
    revalidatePath(path)
  }

  if (tag) {
    revalidateTag(tag, 'max')
  }

  return NextResponse.json({
    ok: true,
    revalidated: {
      path: path || null,
      tag: tag || null,
    },
  })
}
