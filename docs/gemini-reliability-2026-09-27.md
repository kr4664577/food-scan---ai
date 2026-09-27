# Gemini reliability release verification

## Changes

Backend files:

- `backend/src/services/providerErrors.ts`: safe structured provider error codes; consistent HTTP 500/502/503 classification; no raw provider errors returned.
- `backend/src/services/providerRetry.ts`: 25-second shared vision deadline, transport aborts, bounded retries and backoff/jitter.
- `backend/src/services/aiVision.service.ts`: quota cooldown (60 seconds by default), no quota-driven model/xAI fallback, strict JSON parsing, bounded shared vision calls.
- `backend/src/services/visionValidation.ts`: reject explicitly invalid/inconsistent meal nutrition; genuinely unavailable fields remain null.
- `backend/src/middlewares/scanTiming.ts`: request identifiers, disconnect cancellation and sanitized diagnostics.
- `backend/src/middlewares/error.middleware.ts`: safe structured errors and Retry-After metadata.
- `backend/src/controllers/scan.controller.ts`: do not start saving a scan after an observed request cancellation.
- `backend/src/app.ts`: expose request IDs and distinguish application rate limits from provider quota.

The following files were changed identically under both `src/` and `mobile/src/`:

- `store/useAppStore.ts`: per-request identity and cancellation; reject duplicates; clear old reports; discard stale/user-switched success and failure; always clean loading state.
- `api/client.ts`: backend/provider-scoped cooldowns, cancellation-aware metrics, preserve barcode/auth access during Gemini cooldown.
- `utils/scanErrors.ts`: application-owned friendly messages without copying raw provider details.
- `utils/scanPerformance.ts`: request-scoped upload/response/render timings.
- `App.tsx`: prevent late render callbacks from marking a newer scan complete.
- `screens/7_ImagePreviewScreen.tsx`: synchronous submission guard and barcode-detection cleanup/error handling.
- `screens/8_AIProcessingScreen.tsx`: cancellation through the existing navigation/store workflow.

Test files:

- `scripts/test_gemini_reliability.ts`: offline provider, classification, quota, retry, timeout, privacy and web/mobile lifecycle regression coverage.
- `scripts/test_api_regressions.ts`: real local API with mocked provider; success/failure, no failed-scan history writes, guest and cross-user isolation.
- `scripts/test_flow.ts`: reuse the safe isolated integration harness instead of fixed credentials, token logging and live Gemini calls.
- `scripts/test_retry_cooldown.ts`: provider/backend scopes, default cooldown, no cooldown extension, barcode/auth independence.
- `scripts/test_scan_performance.ts`: verify bounded retries under the new error contract.
- `scripts/test_session.ts`: realistic successful meal fixture for response validation.
- `scripts/test_vision_validation.ts`: invalid values reject while missing values remain unavailable.

## Checks actually run

All 11 test entrypoints passed:

- `test_food_validation.ts`
- `test_session.ts`
- `test_meal_editing.ts`
- `test_meal_report.tsx`
- `test_vision_validation.ts`
- `test_scan_performance.ts`
- `test_retry_cooldown.ts`
- `test_api_regressions.ts`
- `test_flow.ts`
- `test_gemini_reliability.ts`
- `test_serverless.cjs` against the emitted API entrypoint, with isolated temporary storage.

Type/build checks passed: `npm run lint` (the repository's TypeScript check), `tsc -p api/tsconfig.json --noEmit`, API compilation, `npm run build`, `npm --prefix mobile run build`, and the complete `npm run vercel-build` pipeline. There is no separate ESLint command or configured native APK release build; mobile verification is its configured TypeScript/Vite production build.

`git diff --check`, web/mobile source equivalence and an added-content credential-pattern check passed. No database adapter/data, environment files/values, dependency locks or Vercel settings were changed. Local duplicate mobile type folders were resolved by `npm ci` from the existing lockfile.

## Scope and remaining manual checks

- Provider responses were mocked; no live Gemini quota was consumed. Real-photo accuracy, live quota recovery, device camera behavior and slow-network cancellation still need manual production testing.
- The shared meal/packaged vision provider uses the new deadline/retry policy. The separate legacy quality-inspection provider was not rewritten; its client lifecycle is protected, but its server-side provider retry policy remains a follow-up.
- Existing packaged OCR/catalog nutrition behavior and file-backed persistence were not migrated or redesigned in this release.
- Existing build-size/Vite compatibility warnings and mobile dependency audit findings (four moderate, one high) remain. No forced dependency upgrades were made.
- GitHub/Vercel release verification is reported after the commit is pushed; local checks alone are not deployment confirmation.
