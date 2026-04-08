import { createHash, timingSafeEqual } from 'crypto'

import type { NextRequest } from 'next/server'

import { toKebabCase } from '@/utilities/toKebabCase'

const defaultScopes = [
  'auth:verify',
  'status:read',
  'pages:write',
  'posts:write',
  'services:write',
  'globals:write',
  'media:write',
  'approval:write',
  'publish:write',
  'search:read',
  'revalidate:write',
  'workflows:write',
  'operations:read',
  'cache:write',
] as const

type WebManagerAuthSuccess = {
  ok: true
  clientIp: string | null
  scope: readonly string[]
}

type WebManagerAuthFailure = {
  ok: false
  error: string
  status: number
}

export type WebManagerAuthResult = WebManagerAuthSuccess | WebManagerAuthFailure

export type WebManagerPageUpsertInput = {
  id?: number | string
  title?: string
  slug?: string
  hero?: Record<string, unknown>
  layout?: unknown[]
  meta?: Record<string, unknown>
  status?: 'draft' | 'published'
  publishedAt?: string | null
}

export type WebManagerPostUpsertInput = {
  id?: number | string
  title?: string
  slug?: string
  content?: Record<string, unknown>
  heroImage?: number | string | null
  categories?: Array<number | string>
  relatedPosts?: Array<number | string>
  authors?: Array<number | string>
  meta?: Record<string, unknown>
  status?: 'draft' | 'published'
  publishedAt?: string | null
}

export const supportedManagedCollections = ['pages', 'posts', 'services'] as const

export type WebManagerManagedCollection = (typeof supportedManagedCollections)[number]

export const isSupportedManagedCollection = (value: string): value is WebManagerManagedCollection =>
  (supportedManagedCollections as readonly string[]).includes(value)

export type WebManagerDocumentLocator = {
  collection: WebManagerManagedCollection
  id?: number | string
  slug?: string
}

export const getWebManagerScope = () => defaultScopes

export const getClientIp = (request: NextRequest): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return normalizeIp(forwardedFor.split(',')[0]?.trim() || null)
  }

  return normalizeIp(request.headers.get('x-real-ip'))
}

export const getAllowedWebManagerIps = () =>
  (process.env.WEB_MANAGER_ALLOWED_IPS || '')
    .split(',')
    .map((value) => normalizeIp(value.trim()))
    .filter(Boolean)

const normalizeIp = (value: string | null) => value?.replace(/^::ffff:/, '') || null

const getWebManagerSecret = () => process.env.WEB_MANAGER_API_SECRET || ''

const getPresentedSecret = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  return request.headers.get('x-web-manager-secret')?.trim() || ''
}

const secretsMatch = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(createHash('sha256').update(expected).digest('hex'))
  const actualBuffer = Buffer.from(createHash('sha256').update(actual).digest('hex'))

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

export const authorizeWebManagerRequest = (request: NextRequest): WebManagerAuthResult => {
  const configuredSecret = getWebManagerSecret()

  if (!configuredSecret) {
    return {
      ok: false,
      error: 'WEB_MANAGER_API_SECRET is not configured.',
      status: 503,
    }
  }

  const presentedSecret = getPresentedSecret(request)

  if (!presentedSecret || !secretsMatch(configuredSecret, presentedSecret)) {
    return {
      ok: false,
      error: 'Invalid web-manager credentials.',
      status: 401,
    }
  }

  const allowedIps = getAllowedWebManagerIps()
  const clientIp = getClientIp(request)

  if (allowedIps.length > 0 && (!clientIp || !allowedIps.includes(clientIp))) {
    return {
      ok: false,
      error: `IP ${clientIp || 'unknown'} is not allowed for web-manager.`,
      status: 403,
    }
  }

  return {
    ok: true,
    clientIp,
    scope: defaultScopes,
  }
}

export const normalizePageInput = (input: WebManagerPageUpsertInput) => {
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

export const normalizePostInput = (input: WebManagerPostUpsertInput) => {
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
    throw new Error('`title` is required when creating a new post.')
  }

  return {
    id: input.id,
    title: normalizedTitle,
    slug: normalizedSlug,
    content: input.content,
    heroImage: input.heroImage,
    categories: input.categories,
    relatedPosts: input.relatedPosts,
    authors: input.authors,
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
                    text: title ? `${title} draft created by web-manager.` : 'Draft created by web-manager.',
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

export const buildDefaultRichTextRoot = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            text,
          },
        ],
      },
    ],
  },
})

export const buildDefaultPostContent = (title?: string) =>
  buildDefaultRichTextRoot(title ? `${title} draft created by web-manager.` : 'Draft created by web-manager.')

export const buildDocumentPath = ({
  collection,
  slug,
}: {
  collection: WebManagerManagedCollection
  slug?: string | null
}) => {
  if (!slug) return null

  if (collection === 'pages') {
    return buildPagePath(slug)
  }

  if (collection === 'posts') {
    return `/posts/${slug}`
  }

  if (collection === 'services') {
    return `/services/${slug}`
  }

  return null
}

export const findManagedDocument = async (
  payload: any,
  locator: WebManagerDocumentLocator,
) => {
  if (locator.id !== undefined) {
    try {
      return await payload.findByID({
        collection: locator.collection,
        id: locator.id,
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      return null
    }
  }

  if (locator.slug) {
    return (
      await payload.find({
        collection: locator.collection,
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: {
          slug: {
            equals: locator.slug,
          },
        },
      })
    ).docs[0] || null
  }

  return null
}

export const collectApprovalIssues = ({
  collection,
  doc,
}: {
  collection: WebManagerManagedCollection
  doc: Record<string, any>
}) => {
  const issues: string[] = []

  if (!doc.title) issues.push('Missing title')
  if (!doc.slug) issues.push('Missing slug')

  if (collection === 'pages') {
    if (!Array.isArray(doc.layout) || doc.layout.length === 0) issues.push('Page layout is empty')
  }

  if (collection === 'posts') {
    if (!doc.content?.root?.children?.length) issues.push('Post content is empty')
  }

  if (collection === 'services') {
    if (!doc.description) issues.push('Service description is missing')
  }

  return issues
}

export const allowedGlobalSlugs = ['header', 'footer', 'settings'] as const

export type WebManagerGlobalSlug = (typeof allowedGlobalSlugs)[number]

export const isAllowedGlobalSlug = (value: string): value is WebManagerGlobalSlug =>
  (allowedGlobalSlugs as readonly string[]).includes(value)

export const defaultCollectionTags: Record<WebManagerManagedCollection, string> = {
  pages: 'pages-sitemap',
  posts: 'posts-sitemap',
  services: 'services-list',
}
