import { createHash, timingSafeEqual } from 'crypto'

import type { NextRequest } from 'next/server'

import { toKebabCase } from '@/utilities/toKebabCase'

const defaultScopes = ['auth:verify', 'status:read', 'pages:write', 'revalidate:write'] as const

type SerenaAuthSuccess = {
  ok: true
  clientIp: string | null
  scope: readonly string[]
}

type SerenaAuthFailure = {
  ok: false
  error: string
  status: number
}

export type SerenaAuthResult = SerenaAuthSuccess | SerenaAuthFailure

export type SerenaPageUpsertInput = {
  id?: number | string
  title?: string
  slug?: string
  hero?: Record<string, unknown>
  layout?: unknown[]
  meta?: Record<string, unknown>
  status?: 'draft' | 'published'
  publishedAt?: string | null
}

export const getSerenaScope = () => defaultScopes

export const getClientIp = (request: NextRequest): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(',')[0]?.trim() || null)
  }

  return normalizeIp(request.headers.get('x-real-ip'))
}

export const getAllowedSerenaIps = () =>
  (process.env.SERENA_ALLOWED_IPS || '')
    .split(',')
    .map((value) => normalizeIp(value.trim()))
    .filter(Boolean)

const normalizeIp = (value: string | null) => value?.replace(/^::ffff:/, '') || null

const getSerenaSecret = () => process.env.SERENA_API_SECRET || ''

const getPresentedSecret = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  return request.headers.get('x-serena-secret')?.trim() || ''
}

const secretsMatch = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(createHash('sha256').update(expected).digest('hex'))
  const actualBuffer = Buffer.from(createHash('sha256').update(actual).digest('hex'))

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

export const authorizeSerenaRequest = (request: NextRequest): SerenaAuthResult => {
  const configuredSecret = getSerenaSecret()

  if (!configuredSecret) {
    return {
      ok: false,
      error: 'SERENA_API_SECRET is not configured.',
      status: 503,
    }
  }

  const presentedSecret = getPresentedSecret(request)

  if (!presentedSecret || !secretsMatch(configuredSecret, presentedSecret)) {
    return {
      ok: false,
      error: 'Invalid Serena credentials.',
      status: 401,
    }
  }

  const allowedIps = getAllowedSerenaIps()
  const clientIp = getClientIp(request)

  if (allowedIps.length > 0 && (!clientIp || !allowedIps.includes(clientIp))) {
    return {
      ok: false,
      error: `IP ${clientIp || 'unknown'} is not allowed for Serena.`,
      status: 403,
    }
  }

  return {
    ok: true,
    clientIp,
    scope: defaultScopes,
  }
}

export const normalizePageInput = (input: SerenaPageUpsertInput) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Request body must be a JSON object.')
  }

  if (!input.id && !input.slug && !input.title) {
    throw new Error('At least one of `id`, `slug`, or `title` is required.')
  }

  const normalizedTitle = typeof input.title === 'string' ? input.title.trim() : undefined
  const normalizedSlugSource = typeof input.slug === 'string' ? input.slug.trim() : normalizedTitle
  const normalizedSlug = normalizedSlugSource ? toKebabCase(normalizedSlugSource) : undefined

  if (!input.id && !normalizedTitle) {
    throw new Error('`title` is required when creating a new page.')
  }

  return {
    id: input.id,
    title: normalizedTitle,
    slug: normalizedSlug,
    hero: input.hero,
    layout: Array.isArray(input.layout) ? input.layout : undefined,
    meta: input.meta,
    publishedAt: input.publishedAt,
    _status: input.status || 'draft',
  }
}

export const buildPagePath = (slug?: string | null) => {
  if (!slug || slug === 'home') {
    return '/'
  }

  return `/${slug}`
}

export const buildDefaultPageLayout = (title?: string) => [
  {
    blockType: 'content',
    blockName: null,
    columns: [
      {
        size: 'full',
        richText: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    text: title ? `${title} draft created by Serena.` : 'Draft created by Serena.',
                  },
                ],
              },
            ],
          },
        },
        enableLink: false,
        link: {
          type: 'reference',
          newTab: false,
          url: null,
          label: null,
          appearance: 'default',
        },
      },
    ],
  },
]

export const buildDefaultPageHero = (title?: string) => ({
  type: 'lowImpact',
  richText: {
    root: {
      type: 'root',
      children: [
        {
          tag: 'h1',
          type: 'heading',
          children: [
            {
              text: title || 'Draft Page',
            },
          ],
        },
      ],
    },
  },
  links: [],
  media: null,
})
