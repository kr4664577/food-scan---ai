# FoodScan AI controlled implementation pass — 2026-09-21

## Completed scope

- Preserved the existing React/Express/Vercel structure and committed session bootstrap.
- Added one-pass image preparation (object URLs for gallery files, bounded canvas size, asynchronous JPEG encoding), duplicate-submit guards, and accurate upload/analysis/report states without percentages.
- Kept the same primary Gemini model and thinking/image-processing settings. The SDK no longer silently retries inside the application's retry loop. One successful scan makes one provider call; the existing four-model chain can make at most five Gemini requests including one transient retry. Quota/auth errors stop immediately.
- Added server and browser timing instrumentation. No image, food result, credential, user identifier, or arbitrary header is included in the new timing logs.
- Barcode responses now bypass catalog/AI guesses. A recognized food taxonomy category is required; known non-food names/categories override positive food tags. Unknown products and network errors fail closed. Missing values remain null; zero remains zero.
- Barcode UI explicitly separates the source's per-100g/100ml values, supplied label serving size, and the user's unrecorded consumed portion. It does not invent ratings, NOVA groups, allergens, ingredients, or healthier-swap numbers.
- AVG CALORIES is the arithmetic mean of valid saved food scans belonging to the current user; no scans yields zero. Missing/negative/nonfinite calories, failed/invalid/non-food flags, quality inspections, foreign-user records and legacy unvalidated barcode records are excluded.
- Dashboard/history fetch stored records on entry, including after session restoration. Errors display unavailable/retry instead of a fabricated average. Late responses cannot rehydrate another user's history or reports.
- Five editable goals use the existing profile API and dietaryGoals field.
- Six goal-based meal ideas replace hardcoded spotlight nutrient/score claims. They deliberately show no numerical nutrition or assumed portion. Fitness goals receive protein-focused wording. These are basic ideas, not nutrient-personalized plans; allergy compatibility is not verified.
- Added actual saved-scan daily counts with 7D/30D/3M (90-day) filters, range-specific scan averages, accessible daily-count details, and empty states. Scans are explicitly not presented as meals consumed.
- Scan-controller errors use the central handler; only explicitly public error messages are returned. No raw provider stack/details are returned by these handlers.

## Performance evidence and measurement limits

Before this pass, two anonymous production photo calls using public app samples returned:
- Banana: 26,129 input bytes; 12,651 ms API round trip; 3 ms response JSON parsing.
- Mixed-food sample: 67,450 input bytes; 10,202 ms API round trip; 3 ms response read/parsing.

Those old responses did not contain Server-Timing, so Gemini time cannot be separated from server/network time retroactively. These were API measurements, not full camera-to-paint measurements, and do not establish median/p95 latency or accuracy.

New browser preparation benchmark (desktop):
- Source: 4,676,504 bytes, 4032 x 4032.
- Prepared JPEG: approximately 380,574 bytes, 1280 x 1280.
- Preparation 374 ms; decode 7 ms; resize/encode 366 ms.
- Public-image download and user preview time excluded.
- This is not a before/after AI quality benchmark and not a mobile-device benchmark.

An 8–10 second end-to-end target is NOT certified. Primary inference quality settings and nutrition prompts were not reduced for speed. Post-deployment live timings should be recorded separately rather than represented as an improvement before they exist.

Server-Timing metrics:
- body: server receipt/JSON parsing (platform edge time is outside this metric).
- normalize: input normalization.
- gemini: summed provider request time; X-Scan-AI-Attempts counts calls.
- ai_parse: structured response parse.
- lookup: product lookup.
- analysis: inclusive pipeline time; do not sum it with its child metrics.
- nutrition: meal-result normalization.
- database: authenticated scan history write.
- serialize: JSON serialization.
- total: server time to response send.

Browser metrics include image decode/encode, upload completion when exposed by the browser, request round trip, response-to-paint approximation, and selection/submit-to-paint. User preview time is reported separately. Missing measurements stay null. Quality-inspection uses its separate legacy provider and does not yet expose the same granular Gemini spans.

Development logging is enabled by Vite DEV/server non-production. Optional build/runtime flags VITE_SCAN_PERF=1 and SCAN_PERF_LOG=1 enable timing logs; no environment values were changed in this pass. Server-Timing remains inspectable on responses. The browser timing header parser accepts only known numeric fields.

History writes remain awaited. Fire-and-forget writes on a serverless platform could silently lose user data. No unrelated history fetch gates the report screen.

Reproduce:
- node scripts/profile_scan.mjs <scan-endpoint> <public-image-url> (one real AI request, no account credentials).
- Serve scripts/profile_image.html through the development Vite server for a public large-image preparation test.
- node --import tsx scripts/test_scan_performance.ts
- node --import tsx scripts/test_food_validation.ts
- node --import tsx scripts/test_api_regressions.ts
- node --import tsx scripts/test_session.ts
- npm run lint
- npm run vercel-build

## Verified tests

- Offline SDK transport: healthy single call, transient retry without SDK multiplication, immediate quota failure, all model fallbacks, five-attempt ceiling.
- Concurrent timing contexts and response preservation.
- Food and beverage categories, non-food electronics/laptop/phone/cosmetics/cleaning/clothing cases, ambiguous/missing categories, unknown barcode, invalid barcode, missing nutrients, genuine zero values, unit separation, and inconsistent sugar/saturated-fat handling.
- Public Open Food Facts lookups: 3017620422003 accepted with calories and no assumed serving; 5449000000996 accepted with source serving; 0000000000000 rejected (404).
- AVG CALORIES: empty=0, 450=450, 450+550=500, 400+500+600=500, zero is valid, invalid/foreign records excluded, loaded records preserve arithmetic.
- Chart empty and populated rendering; guest dashboard verified in browser shows 0 kcal, real empty state and six ideas.
- Isolated local HTTP API: signup/login, authenticated profile, anonymous/invalid-token denial, goal update, stored food scan, no rejected-scan writes, cross-user history/favorites isolation. Tests use random ephemeral credentials and a temporary local data file, removed after the test; no production account was created.
- Store restoration, transient/401 handling, logout, stale responses, duplicate requests, history reload, and late scan/history ownership checks.
- Root TypeScript, root production build, mobile TypeScript/build, and generated CommonJS serverless API smoke tests.
- Production-account login/refresh and goal durability across actual Vercel cold starts have NOT been verified.

## Persistence and remaining work

Post-deployment verification: Vercel reported successful deployment of e84bd5d. Production food and beverage barcode requests returned 200 with food classification; the unknown barcode returned 404 without nutrition. A public banana-image request returned HTTP 429 after 25,244 ms, so no successful post-update photo latency can be claimed. No further live Gemini requests were made. This exposed a serverless response-adapter timing-header gap; instrumentation now wraps the shared end() path, with an adapter regression test, without replacing serialization.

The backend still uses ResilientDatabase's in-memory/file-backed JSON engine. DATABASE_URL being configured does NOT mean Neon is being used. The previously inspected Neon public schema had no tables. No schema, data file, credentials, JWT mechanism, secrets or environment values were changed. No production migration or data deletion was performed.

This is an unresolved durability risk on Vercel, including for goals/history/averages after cold starts. A current recoverable account/history snapshot and a reconciled migration plan remain necessary. Existing runtime-only records cannot be claimed recoverable from the repository snapshot.

Not completed:
- Secure-cookie/session migration; existing bearer-token storage remains.
- Full food-image/non-food/ambiguous recognition validation and portion/ingredient reliability overhaul. Existing photo-analysis normalization still contains legacy fallback values and needs a dedicated validated update; this pass does not certify its accuracy.
- New explainable 0–100 food rating. Barcode view now only shows a source-provided Nutri-Score when present, not an invented application rating.
- Nutrient-quantified recommendations, meal-consumption logging, user nutrient targets, daily protein/macronutrient progress.
- Calorie/protein/rating trends, macro breakdown, meal distribution and goal progress charts. Only saved-scan counts and range averages are implemented.
- Comprehensive mobile-device image-quality benchmark and production p50/p95 latency study.
- Legacy photo/OCR/chat fallback estimates, legacy rating claims, and broader security hardening.

Dependency audit: the unchanged mobile lockfile reports five advisories (one high in Vite, four moderate across development tooling/transitives). A major tooling upgrade is needed; no --force or forced audit fix was used. Large-bundle and root Vite-config warnings remain nonfatal.

No subscriptions, payments, gym/trainer/business systems were introduced.

## References

- [Open Food Facts field definitions](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/html/data-fields.txt): _100g vs _serving, serving_size, categories and no_nutrition_data semantics.
- [Google SDK retry options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html): retry controls; installed SDK declarations specify five default attempts.
- [Gemini media resolution](https://ai.google.dev/gemini-api/docs/media-resolution): quality/latency tradeoff; no lower model resolution was selected in this pass.

## Exact changed files

Both frontend trees remain synchronized because Vercel builds mobile/src while the root app serves the other frontend.
- backend/src/app.ts
- backend/src/controllers/scan.controller.ts
- backend/src/middlewares/error.middleware.ts
- backend/src/middlewares/scanTiming.ts
- backend/src/services/aiVision.service.ts
- backend/src/services/barcode.service.ts
- backend/src/services/mealIntelligence.service.ts
- backend/src/services/packagedIntelligence.service.ts
- mobile/src/App.tsx
- mobile/src/api/client.ts
- mobile/src/components/BarcodeNutritionReport.tsx
- mobile/src/components/MealSuggestions.tsx
- mobile/src/components/ScanAnalytics.tsx
- mobile/src/screens/12_HistoryScreen.tsx
- mobile/src/screens/14_ProfileScreen.tsx
- mobile/src/screens/4_DashboardScreen.tsx
- mobile/src/screens/6_CameraScreen.tsx
- mobile/src/screens/7_ImagePreviewScreen.tsx
- mobile/src/screens/8_AIProcessingScreen.tsx
- mobile/src/screens/9_PackagedReportScreen.tsx
- mobile/src/store/useAppStore.ts
- mobile/src/types/index.ts
- mobile/src/utils/historyStats.ts
- mobile/src/utils/imageUtils.ts
- mobile/src/utils/mealIdeas.ts
- mobile/src/utils/scanPerformance.ts
- scripts/profile_image.html
- scripts/profile_scan.mjs
- scripts/test_api_regressions.ts
- scripts/test_food_validation.ts
- scripts/test_scan_performance.ts
- scripts/test_session.ts
- src/App.tsx
- src/api/client.ts
- src/components/BarcodeNutritionReport.tsx
- src/components/MealSuggestions.tsx
- src/components/ScanAnalytics.tsx
- src/screens/12_HistoryScreen.tsx
- src/screens/14_ProfileScreen.tsx
- src/screens/4_DashboardScreen.tsx
- src/screens/6_CameraScreen.tsx
- src/screens/7_ImagePreviewScreen.tsx
- src/screens/8_AIProcessingScreen.tsx
- src/screens/9_PackagedReportScreen.tsx
- src/store/useAppStore.ts
- src/types/index.ts
- src/utils/historyStats.ts
- src/utils/imageUtils.ts
- src/utils/mealIdeas.ts
- src/utils/scanPerformance.ts
- docs/implementation-pass-2026-09-21.md (this report)
