Important commands for Rito:
- Backend dev: `rtk pnpm dev` (run from backend workspace)
- Backend tests: `rtk pnpm test`, `rtk pnpm test:coverage`
- Backend Prisma: `rtk pnpm prisma:generate`, `rtk pnpm prisma:apply`
- Frontend dev: `rtk pnpm dev` (run from frontend workspace; Next.js on port 4600)
- Frontend build: `rtk pnpm build` (Next.js build must be run with elevated permissions per project instruction)
- Frontend lint: `rtk pnpm lint`
- Frontend tests: `rtk pnpm test`, `rtk pnpm test:coverage`, `rtk pnpm test:e2e`, `rtk pnpm test:e2e:setup`
- Frontend Prisma: `rtk pnpm prisma:copy`, `rtk pnpm prisma:generate`

General command convention: all shell commands should be prefixed with `rtk` in this project.