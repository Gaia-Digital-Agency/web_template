# Web-Manager API V1

This project exposes a small management API under `/api/web-manager/*` so a remote agent workspace can operate the site without using the human admin UI directly.

The current V1 contract is intentionally small and reusable across similar Next.js + Payload CMS websites.

For neutral Grayson-facing usage, the same handlers are also exposed under `/api/web-manager/*`.

## Authentication

All web-manager routes expect one of these headers:

- `Authorization: Bearer <WEB_MANAGER_API_SECRET>`
- `x-web-manager-secret: <WEB_MANAGER_API_SECRET>`

Optional IP allowlisting can be enabled with `WEB_MANAGER_ALLOWED_IPS`.

## Environment Variables

- `WEB_MANAGER_API_SECRET`
- `WEB_MANAGER_ALLOWED_IPS`

## Endpoints

### `GET /api/web-manager/auth/verify`

Checks whether the provided web-manager credentials are valid.

Response:

```json
{
  "ok": true,
  "authenticated": true,
  "clientIp": "34.143.206.68",
  "scope": ["auth:verify", "status:read", "pages:write", "revalidate:write"]
}
```

### `GET /api/web-manager/status`

Returns the management capabilities and basic site status.

Response:

```json
{
  "ok": true,
  "service": "web-manager-v1",
  "scope": ["auth:verify", "status:read", "pages:write", "revalidate:write", "workflows:write"],
  "serverUrl": "http://34.124.244.233/template",
  "basePath": "/template",
  "environment": "production",
  "collections": {
    "pages": {
      "total": 12
    }
  },
  "features": {
    "pageUpsert": true,
    "revalidate": true,
    "publishBundle": true,
    "operationsHealth": true,
    "operationsCache": true
  }
}
```

### `POST /api/web-manager/pages/upsert`

Creates or updates a Payload `pages` document by `id` or `slug`.

Request:

```json
{
  "title": "About Web Manager",
  "slug": "about-web-manager",
  "status": "draft",
  "hero": {
    "type": "lowImpact"
  },
  "layout": [],
  "meta": {
    "title": "About Web Manager",
    "description": "Draft page created by Grayson web-manager"
  }
}
```

Notes:

- If `id` is provided, it updates that page.
- If `slug` is provided and exists, it updates that page.
- If nothing exists, it creates a new page.
- If `hero` is omitted for a new page, the API defaults it to `{ "type": "lowImpact" }`.
- If `layout` is omitted for a new page, the API defaults it to `[]`.

### `POST /api/web-manager/revalidate`

Triggers Next.js cache revalidation for a path, slug, or tag.

Request examples:

```json
{ "slug": "about-web-manager" }
```

```json
{ "path": "/about-web-manager" }
```

```json
{ "tag": "pages-sitemap" }
```

### `POST /api/web-manager/posts/upsert`

Creates or updates a Payload `posts` document by `id` or `slug`.

Request:

```json
{
  "title": "Yesterday blog draft",
  "slug": "yesterday-blog-draft",
  "status": "draft",
  "meta": {
    "title": "Yesterday blog draft",
    "description": "Draft blog post created by Grayson web-manager"
  }
}
```

If `content` is omitted, the API creates a minimal valid rich-text body automatically.

### `POST /api/web-manager/globals/update`

Updates a supported Payload global.

Currently supported globals:

- `header`
- `footer`
- `settings`

Request:

```json
{
  "global": "settings",
  "data": {
    "contactEmail": "hello@example.com"
  }
}
```

### `POST /api/web-manager/media/upload`

Uploads an asset into the `media` collection using multipart form data.

Form fields:

- `file` - required
- `alt` - optional
- `folder` - optional

Example:

```bash
curl -X POST "$BASE_URL/api/web-manager/media/upload" \
  -H "Authorization: Bearer $WEB_MANAGER_API_SECRET" \
  -F "file=@./hero.jpg" \
  -F "alt=Homepage hero"
```

### `POST /api/web-manager/approval/request`

Checks whether a managed document is ready to publish.

Supported collections:

- `pages`
- `posts`
- `services`

Request:

```json
{
  "collection": "posts",
  "slug": "yesterday-blog-draft"
}
```

Response includes:

- readiness flag
- validation issues
- current status
- resolved path

### `POST /api/web-manager/publish`

Publishes a managed document after an approval check.

Request:

```json
{
  "collection": "posts",
  "slug": "yesterday-blog-draft"
}
```

By default this enforces approval readiness. To bypass readiness checks explicitly:

```json
{
  "collection": "posts",
  "slug": "yesterday-blog-draft",
  "requireApproval": false
}
```

### `GET /api/web-manager/content/search?q=...`

Searches across managed content collections for web-manager workflows.

Current search scope:

- `pages`
- `posts`
- `services`

Example:

```bash
curl -H "Authorization: Bearer $WEB_MANAGER_API_SECRET" \
  "$BASE_URL/api/web-manager/content/search?q=blog&limit=5"
```

### `GET /api/web-manager/operations/health`

Returns lightweight service health for the website-side management layer.

Response includes:

- auth result
- CMS/database readiness
- uptime
- page count

### `POST /api/web-manager/operations/cache`

Batch cache invalidation wrapper for paths and tags.

Request examples:

```json
{
  "paths": ["/", "/posts/yesterday-blog-draft"],
  "tags": ["posts-sitemap"]
}
```

```json
{
  "slug": "about-web-manager",
  "tag": "pages-sitemap"
}
```

### `POST /api/web-manager/workflows/publish-bundle`

Runs a reusable publish workflow:

- validates approval readiness
- publishes the document
- revalidates the resolved document path
- revalidates a collection tag

Request:

```json
{
  "collection": "posts",
  "slug": "yesterday-blog-draft",
  "revalidateTag": "posts-sitemap"
}
```

## Intended Evolution

The next reusable endpoints for other web-manager-managed sites should likely be:

- `/api/web-manager/approvals/queue`
- `/api/web-manager/services/upsert`
- `/api/web-manager/forms/upsert`

This keeps the contract stable across sites while allowing each project to expose only the content domains it actually supports.
