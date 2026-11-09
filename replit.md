# Suhbat

A bilingual Uzbek and Russian messaging app for direct and group conversations.

## Run & Operate

- The Replit mobile workflow runs the Expo app: `pnpm --filter @workspace/mobile run dev`
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Replit Secrets provide the Clerk keys; the Replit database provides `DATABASE_URL`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile` — Expo app and screens
- `artifacts/api-server` — Express API and chat endpoints
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema` — PostgreSQL schema

## Architecture decisions

- Chat messages, conversation membership, and user records are persisted in PostgreSQL.
- Clerk supplies user authentication; mobile API calls send the Clerk session token.

## Product

Users can sign in, find other users by name or email, and send saved messages in direct or group chats.

## User preferences

The app interface supports Uzbek and Russian.

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run codegen before checking the API and mobile packages.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
