import { Buffer } from 'buffer'

import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { authorizeWebManagerRequest } from '@/utilities/web-manager'

export async function POST(request: NextRequest) {
  const auth = authorizeWebManagerRequest(request)

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const alt = formData.get('alt')
  const folder = formData.get('folder')

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: '`file` must be provided as multipart form data.' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await payload.create({
    collection: 'media',
    data: {
      alt: typeof alt === 'string' ? alt : file.name,
      ...(typeof folder === 'string' && folder ? { folder } : {}),
    } as any,
    file: {
      data: buffer,
      mimetype: file.type || 'application/octet-stream',
      name: file.name,
      size: file.size,
    } as any,
    depth: 0,
    overrideAccess: true,
  })

  payload.logger.info(`[web-manager] media uploaded filename=${file.name} ip=${auth.clientIp || 'unknown'}`)

  return NextResponse.json({
    ok: true,
    media: {
      id: result.id,
      alt: result.alt,
      filename: result.filename,
      url: result.url,
      mimeType: result.mimeType,
      filesize: result.filesize,
    },
  })
}
