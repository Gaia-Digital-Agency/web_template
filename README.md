# Template Base Project

A headless CMS + Next.js base project built with [Payload CMS](https://payloadcms.com) and PostgreSQL.

This project is intended to be used as a template for future website builds. The expected workflow is:

1. Duplicate this project into a new project folder.
2. Create a separate database and environment values for the new project.
3. Update branding, content model, routes, and deployment settings for that new project.
4. Treat this repository as the base starting point, not as a production site tied to a single client.

## Current Role

- Server path: `/var/www/template`
- Git remote: `git@github.com:Gaia-Digital-Agency/web_template.git`

This is the base template project, forked from the `gaiadaweb` project and maintained as a reusable starter for future builds.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **CMS**: Payload CMS 3.80
- **Database**: PostgreSQL 18
- **Styling**: TailwindCSS 4 + shadcn/ui
- **Package Manager**: pnpm

## Intended Usage For New Projects

When starting a new project from this template:

- duplicate the project folder
- create a new PostgreSQL database and database user
- update `.env`
- update `NEXT_PUBLIC_SERVER_URL`
- update nginx or domain routing
- update collections, globals, seed data, branding, and frontend content
- commit the new project to its own repository if needed

Do not keep future duplicated projects on the same database as another project.

## Environment Variables

The project uses the standard environment values below:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PAYLOAD_SECRET` | Payload secret |
| `NEXT_PUBLIC_SERVER_URL` | Public base URL |
| `CRON_SECRET` | Cron auth secret |
| `PREVIEW_SECRET` | Preview auth secret |

## Project Structure

Top-level folders of note:

- `src` - application source
- `public` - public assets
- `scripts` - maintenance and utility scripts
- `tests` - test configuration and test files
- `docs` - project documentation and prompts
- `config/tooling` - moved tooling config files
- `database_backup` - compressed database backups created on the server

Important root files still remain at project root because the framework/tooling expects them there, including:

- `next.config.ts`
- `tsconfig.json`
- `postcss.config.js`
- `tailwind.config.mjs`
- `package.json`
- `.env`

## Tooling Notes

The following config files were moved into `config/tooling` to keep the root cleaner:

- `config/tooling/eslint.config.mjs`
- `config/tooling/next-sitemap.config.cjs`

`package.json` scripts were updated to point to those new paths.

## Web-Manager API

This template includes a reusable web-manager management layer under `/api/web-manager/*`.

Current V1 endpoints:

- `GET /api/web-manager/auth/verify`
- `GET /api/web-manager/status`
- `POST /api/web-manager/pages/upsert`
- `POST /api/web-manager/posts/upsert`
- `POST /api/web-manager/globals/update`
- `POST /api/web-manager/media/upload`
- `POST /api/web-manager/approval/request`
- `POST /api/web-manager/publish`
- `GET /api/web-manager/content/search`
- `POST /api/web-manager/revalidate`
- `GET /api/web-manager/operations/health`
- `POST /api/web-manager/operations/cache`
- `POST /api/web-manager/workflows/publish-bundle`

Neutral Grayson-facing aliases are also available under `/api/web-manager/*` with the same request and response shapes.

See `docs/web-manager-api.md` for the contract and expected environment variables.

## Database Backup

A compressed database backup for the template project can be stored in:

- `database_backup/`

Example backup created on the server:

- `database_backup/template_db_20260404_055332.sql.gz`

## Deployment

Running on GCP VM (`gda-s01`) as of April 4, 2026:

- **PM2 process**: `template` on port `3004`
- **Nginx**: `/template` location block in `sites-enabled/gda-s01` proxying to `127.0.0.1:3004`
- **URL**: `http://34.124.244.233/template`
- **Admin**: `http://34.124.244.233/template/admin`
- **Database**: `template_db` owned by `template_user`

## Build Status

Current state as of April 4, 2026:

- Production build passes cleanly
- Two TypeScript fixes applied: `plugins/index.ts` (field.blocks cast) and `seed/index.ts` (navItems cast)
- Site is live and serving via PM2 + Nginx

## Development

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Start production server:

```bash
pnpm start
```

Lint:

```bash
pnpm lint
```

## Notes

This README should describe the template state of the project, not the original `gaiadaweb` deployment state.

If this project is duplicated for a new client or internal build, update this README in that new copy to reflect the new project database, URL, deployment path, and business purpose.
