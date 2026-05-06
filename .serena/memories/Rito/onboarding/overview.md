Rito is a social bookmarking service on ATProto. The repo contains at least three top-level workspaces: backend (TypeScript service with Prisma, Jetstream ingestion, OAuth, tests, scripts), frontend (Next.js app with App Router, Prisma generation, i18n, Mantine, Playwright/Vitest tests), and extension (separate workspace, likely browser extension). Root README describes Rito in Japanese and English as a social bookmarking service with site-owner introductions.

Key structure:
- backend/src: service entrypoint, db/config/logger/utils, lexicon types, scripts, tests.
- frontend/src: Next.js app logic, components, state stores, lexicon types, i18n, tests, data files.

The project uses TypeScript and is organized by backend/frontend workspaces rather than a single monolith.