# Project Pulse

Project Pulse is a scalable CRUD starter built with SvelteKit, TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL.

## Stack

- SvelteKit with server-rendered routes and form actions
- TypeScript with strict mode
- Tailwind CSS with lightweight design tokens
- Drizzle ORM with committed migrations
- PostgreSQL for both local development and production
- Vercel adapter for deployment

## Architecture

The codebase uses a feature-first modular monolith:

- `src/lib/server/db`
  Database client, schema, and migrations.
- `src/lib/server/features`
  Feature modules with `schema`, `repository`, `queries`, `service`, and `types` files.
- `src/lib/server/shared`
  Cross-feature server-only helpers such as errors and shared utilities.
- `src/lib/ui`
  Reusable presentation components and visual tokens.
- `src/routes`
  Thin route handlers and pages that orchestrate services instead of embedding business logic.

This structure is intentionally predictable so both humans and AI tooling can load the codebase quickly.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL with Docker on local port `55432`:

```bash
docker compose up -d postgres
```

4. Generate migrations if needed and apply them:

```bash
npm run db:generate
npm run db:migrate
```

5. Seed sample data:

```bash
npm run db:seed
```

6. Run the app:

```bash
npm run dev
```

Or use the helper script:

```powershell
./scripts/setup-local-db.ps1
```

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:seed
```

## Quality Checks

```bash
npm run check
npm run test
npm run format
```

## Vercel Deployment

Recommended free production database:

- Neon Postgres free tier

Deployment steps:

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add these environment variables in Vercel:
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - `APP_ENV=production`
4. Run migrations against the production database before serving live traffic.
5. Deploy.

Important runtime note:

- This starter uses the Vercel Node runtime, not the Edge runtime, because it connects to standard PostgreSQL through `pg`.

## Sample Domain

The CRUD sample domain is:

- Projects
- Tasks linked to projects

This demonstrates a realistic one-to-many relational workflow without overcomplicating the starter.
