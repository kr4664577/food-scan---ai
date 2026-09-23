# FoodScan AI reliability pass

Continues main at e84bd5d; preserves existing application, deployment configuration, primary vision model, session bootstrap and barcode pipeline. No new dependencies, credentials, environment values or account/history data changes.

## Nutrition safety

Meal-photo analysis now requires explicit food classification before using nutrients. Non-food and ambiguous meal results stop with a public error; no nutrition report, rating, suggestions or saved scan is generated. Validation is a guard on provider output, not a claim of perfect visual recognition. The separate legacy packaged-photo/OCR pipeline is not overhauled in this pass; its remaining fallbacks need follow-up. Live recognition accuracy remains unverified because the last production AI request returned 429.

Missing fields remain unavailable rather than becoming fixed calories, macros, a plate size, guessed ingredients or high confidence. Portions and visual nutrient estimates remain labeled as estimates. Meal totals require complete per-item data for each nutrient. Correcting a food name invalidates its old nutrition; portion changes scale only known values. Manual additions never derive macros from calories. Report edits are local, not silently applied to saved history.

The reproducible 0–100 rating is an explicitly experimental app heuristic, not a validated medical score. Its rules, missing inputs and estimate status are shown. Total sugar is not misrepresented as added sugar. Incomplete essentials produce an unavailable score.

## Performance and errors

The existing compression and duplicate-submit protections remain. Server timing now wraps the final response end so Vercel's JSON adapter cannot skip the headers. Provider Retry-After headers/structured RetryInfo are converted to safe numeric metadata. No automatic retry occurs on quota or requested cooldowns; the frontend prevents early resubmission while allowing session requests. Healthy requests still make one provider call; existing fallback order is unchanged.

Previous measurements (not a new successful benchmark): photo API round trips were 12,651 ms and 10,202 ms before the performance pass. After e84bd5d a 26,129-byte banana request returned 429 after 25,244 ms; timing headers were absent on that adapter path. These cannot establish provider-only latency or an 8–10 second full-flow target. Desktop preparation of a 4.68 MB image took 374 ms and produced a roughly 381 KB JPEG in the preceding pass. No additional live Gemini calls are needed for this pass.

## Storage finding and safe migration plan

Current `backend/src/config/db.ts` stores users, password hashes, allergies, scans and favorites in process memory plus `foodscan_persistent_data.json` (or FOODSCAN_STORAGE_FILE). Goals live on the user record. Browser storage holds a bearer token; server profile lookup still depends on this same file-backed user store. DATABASE_URL is logged but no PostgreSQL client is instantiated. Local file writes are swallowed on error, and separate Vercel instances do not share these writes. Cold-start/account/history durability is therefore NOT guaranteed.

The existing Prisma schema defines User, UserAllergy, ScanHistory, Favorite and FoodMasterItem; it is not active runtime persistence. Prior inspection found no Neon public tables. No current production schema changes or migration were attempted in this pass.

Safe cutover requirements:

1. Obtain an authorized, recoverable snapshot of current runtime accounts/history/favorites (not only the older tracked JSON snapshot). Reconcile duplicate emails/IDs and counts without printing sensitive records. Never place this export in Git.
2. Re-inspect the actual Neon schema and backup/branch state read-only. Check for existing tables/rows and compatibility; do not run destructive schema push/reset.
3. Implement one PostgreSQL adapter behind the current repository methods, preserving IDs, password hashes and nullable nutrition/provenance. Use parameterized queries, unique email/favorite constraints, foreign keys and indexes on userId/createdAt.
4. Import into a staging/Neon branch transactionally with conflict reports rather than overwrites. Verify counts, login, ownership, goal updates, nullable nutrition and history across independent cold starts.
5. Arrange a controlled write freeze and final reconciliation, backup, cutover and rollback. Keep the old snapshot recoverable. Do not silently switch production before these checks.

The user has no export. Runtime-only records cannot be claimed recoverable from the repository. This prevents a safe automatic migration now; no partial second store was introduced. On September 23, the current adapter and schema files were re-inspected and confirmed unchanged. No current production database connection/schema access or backup was established in this pass. We did not force a production restart as a test: doing so cannot prove durable storage and could discard the very runtime-only records that need preservation. Users, goals, history and favorites surviving Vercel cold starts remain unverified and unsupported by the current adapter.

## Remaining verification limits

- Provider output normalization is tested with fixtures, not a new live image-accuracy study. Quota prevented full live photo verification.
- Production-account login/refresh and true cross-cold-start persistence require authorized account testing and the storage cutover above. Local session/ownership tests are not proof of production durability.
- Browser bearer storage remains (no authentication rewrite). No new secret values are introduced.
- Scans are not meals consumed. No fabricated meal distribution, daily intake, personalized nutrient targets or goal-completion percentage is shown without meal logging and explicit targets.
- Existing development-tool dependency audit warnings and bundle-size warnings are outside this prioritized pass; no forced upgrades.
- No subscriptions, payments, business/gym/trainer features or branding redesign.

## Verification of the final working tree

Passed: TypeScript (`npm run lint`); focused scripts `test_vision_validation.ts`, `test_meal_report.tsx`, `test_meal_editing.ts`, `test_session.ts`, `test_food_validation.ts`, `test_retry_cooldown.ts`, `test_scan_performance.ts`, and `test_api_regressions.ts`. These use isolated local data/mocked provider transports, not live Gemini. The full `vercel-build` command completed root and mobile builds, including mobile clean dependency installation. Existing audit warnings remain: four moderate and one high development-tooling advisories, plus bundle-size warnings. Both source trees are synchronized. No forced dependency upgrade was performed.

Session tests include restored login, transient failures, logout, stale replies, authoritative favorites state and account/history isolation. API tests cover temporary local signup/login/profile/goals/history/favorites; their temporary storage is removed. These tests do not claim production cold-start persistence.

## Exact files changed in this pass

- backend/src/app.ts
- backend/src/controllers/scan.controller.ts
- backend/src/middlewares/error.middleware.ts
- backend/src/middlewares/scanTiming.ts
- backend/src/services/aiVision.service.ts
- backend/src/services/mealIntelligence.service.ts
- backend/src/services/providerRetry.ts
- backend/src/services/visionValidation.ts
- docs/implementation-pass-2026-09-21.md
- docs/reliability-pass-2026-09-22.md
- mobile/src/api/client.ts
- mobile/src/components/NutritionVisuals.tsx
- mobile/src/screens/10_MealReportScreen.tsx
- mobile/src/screens/13_FavoritesScreen.tsx
- mobile/src/screens/3_AuthScreen.tsx
- mobile/src/store/useAppStore.ts
- mobile/src/types/index.ts
- mobile/src/utils/mealNutrition.ts
- scripts/test_meal_editing.ts
- scripts/test_meal_report.tsx
- scripts/test_retry_cooldown.ts
- scripts/test_scan_performance.ts
- scripts/test_session.ts
- scripts/test_vision_validation.ts
- src/api/client.ts
- src/components/NutritionVisuals.tsx
- src/screens/10_MealReportScreen.tsx
- src/screens/13_FavoritesScreen.tsx
- src/screens/3_AuthScreen.tsx
- src/store/useAppStore.ts
- src/types/index.ts
- src/utils/mealNutrition.ts
