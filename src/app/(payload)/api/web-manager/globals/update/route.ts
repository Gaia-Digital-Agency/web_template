import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { allowedGlobalSlugs, authorizeWebManagerRequest, isAllowedGlobalSlug } from '@/utilities/web-manager'

type GlobalUpdateBody = {
  global: string
  data: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  let body: GlobalUpdateBody

  try {
    body = (await request.json()) as GlobalUpdateBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || typeof body.global !== 'string' || !body.data || typeof body.data !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Request body must include `global` and `data`.' },
      { status: 400 },
    )
  }

  if (!isAllowedGlobalSlug(body.global)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported global. Allowed values: ${allowedGlobalSlugs.join(', ')}`,
      },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config: configPromise })
  const result = await payload.updateGlobal({
    slug: body.global,
    data: body.data as any,
    depth: 0,
    overrideAccess: true,
  })

  payload.logger.info(`[web-manager] global updated slug=${body.global} ip=${auth.clientIp || 'unknown'}`)

  return NextResponse.json({
    ok: true,
    global: body.global,
    updatedAt: result.updatedAt || null,
    data: result,
  })
}
