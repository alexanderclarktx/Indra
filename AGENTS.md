## Indra quick notes
- Monorepo with `core/` (TypeScript library) and `web/` (frontend). Uses Bun.
- Common scripts: `bun dev` (web + API watch), `bun start` (core/main.ts), `bun typecheck`.
- API server entry: `core/api/Api.ts` (serves `/api/graph` on port 5001).

## Code styling
- Never end lines with `;`.
- Never use `class`; declare a type and a function returning an instance of that type.
