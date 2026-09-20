# Serverless authentication startup

Signup posts to `/api/auth/register`, mounted by `backend/src/app.ts` and handled
by `backend/src/controllers/auth.controller.ts`. Login uses `/api/auth/login`.

Vercel invokes `api/index.ts`; it does **not** invoke the `dist/server.cjs`
bundle produced by the root build. A successful root build therefore does not
verify the deployed function's module format.

The root package uses ESM and its frontend tsconfig uses bundler resolution.
Inheriting those settings emitted an extensionless ESM import of
`../backend/src/app`. Loading Vercel's generated function with Node reproduced
`ERR_MODULE_NOT_FOUND` before Express or signup could run. Both production
`GET /api/health` and an empty `POST /api/auth/register` returned HTTP 500 with
`FUNCTION_INVOCATION_FAILED` before the fix.

`api/package.json` explicitly selects CommonJS; `api/tsconfig.json` uses NodeNext
resolution, which honors that package boundary and the backend's CommonJS
package. The frontend retains its ESM configuration. Explicit `typeRoots` keep
Node typings resolvable when Vercel invokes TypeScript through a temporary
configuration file.

## Verification

- `npm run lint`
- `npx tsc --project api/tsconfig.json --noEmit`
- `npm run vercel-build`
- Build the function with Vercel's Node builder, then run:
  `node scripts/test_serverless.cjs /absolute/path/to/generated/function/api/index.js`

The function smoke test checks module loading, health, signup/login validation,
authentication enforcement, and scan validation. It creates no accounts and
uses no credentials or model calls. An actual signup/login round trip still
requires an authorized account test.

## Separate configuration and persistence findings

`dotenv.config()` runs in `backend/src/app.ts`; Vercel supplies production
variables through `process.env`. Auth reads `JWT_SECRET` when signing/verifying
tokens and currently falls back to a hardcoded value if absent. Production
must have a private `JWT_SECRET`; its presence cannot be inferred from health.

Despite the exported name `prisma`, `backend/src/config/db.ts` instantiates a
file-backed `ResilientDatabase`, not PrismaClient. `DATABASE_URL` is only logged
in redacted form. File-write failures are caught, so they do not explain the
observed startup crash, but this storage cannot provide reliable account
persistence across Vercel instances. Connecting the intended database requires
verification of its schema and a data-preserving migration; this startup fix
does not silently switch stores or move accounts into ephemeral `/tmp` storage.

Production variable names, scopes, and runtime logs require authenticated
Vercel access. Do not copy variable values into logs, issues, or test output.
