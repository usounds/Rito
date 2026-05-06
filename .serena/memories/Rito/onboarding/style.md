Code style and conventions for Rito:
- TypeScript throughout; ESM modules are used (`type: module` in package.json).
- Backend and frontend both organize code by feature/domain folders with tests in `__tests__`.
- Frontend uses Next.js App Router, React components, Zustand state stores, i18n JSON messages, SCSS modules, and Playwright/Vitest for tests.
- Backend uses Prisma models, Jetstream ingestion, logging, and utility modules.
- Keep changes minimal and localized; prefer existing patterns in the relevant workspace.
- When using shell commands in this project, prefix with `rtk`.
- Follow project-specific constraints already known in memory, including: Next.js builds require privileged execution; user prefers E2E on real production routes and wants explicit labels in composer UI.

If new style details are needed, inspect adjacent files and existing tests before editing.