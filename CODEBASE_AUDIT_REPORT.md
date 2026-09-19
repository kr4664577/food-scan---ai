# FoodScan AI — Comprehensive Codebase Audit Report

**Date of Audit:** September 19, 2026  
**Auditor Role:** Senior Full-Stack Software Engineer & Mobile App Architect  
**Audited Targets:**
- Production Deployment: [https://food-scan-ai-one.vercel.app/](https://food-scan-ai-one.vercel.app/)
- Source Repository: [https://github.com/kr4664577/food-scan---ai](https://github.com/kr4664577/food-scan---ai)
**Audit Status:** Read-Only Complete / Awaiting Implementation Approval

---

## Executive Summary

A comprehensive architectural and functional codebase audit was performed on the FoodScan AI full-stack application (monorepo consisting of `backend/`, `mobile/`, and `api/`).

The core computer vision pipelines (Meal Dish Identification, Food Quality/Freshness Inspection, and OpenFoodFacts Barcode Lookup) are soundly conceived and functional on the backend. However, several critical architectural incompatibilities, hardcoded mock values, and network routing blockers currently break end-to-end scanning, native mobile connectivity, and database persistence on production.

This document details:
1. Complete 17-point architectural audit
2. End-to-end food scanning trace and breakage analysis
3. P0 / P1 / P2 prioritized issue inventory
4. Inventory of features that are working and must NOT be broken
5. Hardcoded values, exposed secrets, and Play Store blockers
6. Recommended production architecture
7. Step-by-step implementation roadmap
8. The exact first 3 fixes ready to be executed upon approval

---

## 1. Complete Architecture Audit (17 Core Areas)

### 1.1 Frontend Architecture
- **Framework & Libraries:** React 18.3.1 SPA built with Vite 5.4.2, TypeScript 5.5.4, Tailwind CSS 3.4.10, PostCSS, and Lucide React icons (`0.439.0`).
- **State Store:** Single-store Zustand architecture (`mobile/src/store/useAppStore.ts`). Holds UI navigation states (`currentScreen`, `previousScreen`), scanning modes, user credentials, active report objects (`activePackagedReport`, `activeMealReport`, `activeQualityReport`), history, and favorite lists.
- **Screen Router:** State-based routing switch (`mobile/src/App.tsx`) rendering 16 distinct screens:
  `1_SplashScreen` → `2_OnboardingScreen` → `3_AuthScreen` → `4_DashboardScreen` → `5_ScanSelectionScreen` → `6_CameraScreen` → `7_ImagePreviewScreen` → `8_AIProcessingScreen` → `9_PackagedReportScreen` → `10_MealReportScreen` → `11_QualityReportScreen` → `12_HistoryScreen` → `13_FavoritesScreen` → `14_ProfileScreen` → `15_SettingsScreen` → `16_PrivacyDisclaimerScreen`.
- **API Client:** Axios 1.7.5 (`mobile/src/api/client.ts`) with a 60-second timeout, custom base URL normalizer (`normalizeApiUrl`), request/response logging, and bearer token injector (`setAuthToken`).

### 1.2 Backend Architecture
- **Runtime:** Express 4.19.2 on Node.js / TypeScript (`backend/src/app.ts`), exported for Vercel Serverless Function deployment via `api/index.ts`.
- **Monorepo Build Configuration:**
  - `package.json` at root defines `vercel-build`: `npm --prefix backend install && npm --prefix backend run prisma:generate && npm --prefix mobile install && VITE_API_URL=/api npm --prefix mobile run build`.
  - `vercel.json` rewrites `/api/(.*)` to `/api` and serves `mobile/dist` as static frontend assets.
- **Middleware Stack:**
  - `helmet()` for secure HTTP headers.
  - `cors({ origin: '*' })` for cross-origin requests.
  - `express.json({ limit: '15mb' })` for Base64 image payload handling.
  - `rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })` in-memory rate limiter on `/api`.
  - `errorHandler` centralized error-handling middleware (`backend/src/middlewares/error.middleware.ts`).

### 1.3 Gemini API Integration
- **SDK:** `@google/generative-ai` (v0.17.1) instantiated in `backend/src/services/ai.service.ts` and `aiVision.service.ts` using `process.env.GEMINI_API_KEY`.
- **Pipelines:**
  - **Meal Vision (`runMealIntelligencePipeline`):** Multi-modal image prompt identifying dishes, individual components, estimated weights, calories, and macronutrients. Employs `responseMimeType: 'application/json'`.
  - **Packaged Food OCR (`runPackagedIntelligencePipeline`):** Extracts ingredient lists, nutrition panel tables, food additives, and NOVA classification scores.
  - **Quality Inspection (`QualityInspectionEngineFactory`):** Evaluates visible spoilage, mold, and damage. Enforces strict legal disclaimers against claiming food is pathogen-free or 100% hygienic.
  - **Unified Chat (`handleNutritionChat`):** Uses Gemini with Grok fallback to provide conversational nutritional advice and healthier swap recommendations.

### 1.4 Food Image Upload and Scanning Flow
- **Live Camera Stream:** HTML5 `navigator.mediaDevices.getUserMedia` (`facingMode: 'environment'`). Captures frames directly by rendering video to an in-memory `<canvas>` and extracting JPEG data via `canvas.toDataURL('image/jpeg', 0.88)` (`mobile/src/screens/6_CameraScreen.tsx`).
- **Gallery & File Upload:** File input handler reading files with `FileReader.readAsDataURL()`, with automatic canvas downsampling to a maximum dimension of 1024px at 0.85 JPEG quality before storing in Zustand.
- **Sample Photos:** Built-in Unsplash fallback URLs for testing (e.g., Pizza, Banana, Rice Bowl, Biscuits).

### 1.5 Nutrition Calculation Logic
- **Backend Aggregation:** `mealIntelligence.service.ts` calculates `totalNutrition` by summing component values:
  $$\text{Calories}_{\text{total}} = \sum \text{Calories}_i$$
  $$\text{Macro}_{\text{total}} = \sum \text{Macro}_i$$
- **Client Portion Scaling:** `scaleMealPortion(multiplier)` in Zustand scales all item macronutrients:
  $$\text{Calories} = \text{round}(\text{base} \times \text{multiplier})$$
  $$\text{Macro} = \text{round}(\text{base} \times \text{multiplier} \times 10) / 10$$
- **Client Meal Item Editing:** Allows users to add, edit, or delete meal items with real-time recalculation of total nutrition.

### 1.6 Database and Prisma / Schema
- **ORM:** Prisma 5.19.0 (`backend/prisma/schema.prisma`).
- **Configured Provider:** `provider = "sqlite"` with `url = env("DATABASE_URL")` and local file `dev.db` (72 KB).
- **Models Defined:**
  - `User`: Credentials, dietary goals, timestamps.
  - `UserAllergy`: Relational allergen list per user with cascade deletion.
  - `ScanHistory`: Saved scans containing nutrition metrics, raw OCR text, allergens, additives, and confidence scores.
  - `Favorite`: Join table for favorited user scans.
  - `FoodMasterItem`: Pre-seeded local Indian/global food database (`backend/src/db/foodCatalog.ts`) containing portion sizes, NOVA levels, and healthy swap recommendations.
- **Production Status:** **FAILED / CRASHED**. Live HTTP probes to `/api/auth/login` returned:
  ```text
  Invalid `prisma.user.findUnique()` invocation:
  error: Environment variable not found: DATABASE_URL.
    --> schema.prisma:3
     | 2 | provider = "sqlite"
     | 3 | url      = env("DATABASE_URL")
  ```

### 1.7 Authentication and User Management
- **Backend Implementation:** `backend/src/controllers/auth.controller.ts` provides `register`, `login`, `getProfile`, and `updateProfile` with `bcryptjs` password hashing and `jsonwebtoken` signing (30-day expiry). Protected via `authenticateJWT` middleware (`backend/src/middlewares/auth.middleware.ts`).
- **Frontend Implementation:** `mobile/src/screens/3_AuthScreen.tsx` currently **bypasses all backend API calls** and injects a hardcoded mock user (`alex.foodie@foodscan.ai`) and a static string (`'demo_jwt_token_foodscan_2026'`).

### 1.8 API Routes and Controllers
- `GET  /api/health` — System health, service name, version (200 OK).
- `POST /api/scan/barcode` — Barcode lookup via OpenFoodFacts/USDA API (200 OK).
- `POST /api/scan/packaged` — Base64 OCR analysis of food labels (Active).
- `POST /api/scan/meal` — Multimodal plate and dish breakdown (Active & verified).
- `POST /api/scan/quality` — Optical surface freshness analysis (Active & verified).
- `POST /api/chat` — Nutrition advice & healthier swaps assistant (Active).
- `POST /api/upload` — Multipart image upload via Multer.
- `GET  /api/history/scans` — User scan history (Fails with 401/500).
- `POST /api/history/favorites/toggle` — Toggle favorite scan (Fails with 401/500).
- `POST /api/auth/register` & `POST /api/auth/login` — Fails with 500 (`DATABASE_URL` missing).

### 1.9 Error Handling
- **Backend:** Express error handler (`error.middleware.ts`) formats responses into `{ success: false, error: { message, statusCode } }`.
- **Frontend:** Try/catch blocks in `useAppStore.ts` catch network failures and display user-friendly error banners on `7_ImagePreviewScreen.tsx`.

### 1.10 CORS Configuration
- Universal `cors({ origin: '*' })` configured in Express. Works for web, but lacks preflight max-age caching and does not explicitly whitelist native mobile origins (`capacitor://localhost`, `http://localhost`).

### 1.11 Environment Variables and Secrets
- `GEMINI_API_KEY`: Kept secure server-side on Vercel.
- `DATABASE_URL`: Missing in Vercel production environment.
- `JWT_SECRET`: Falls back to `'fallback_jwt_secret'` if undefined.
- `OFF_API_URL`: Optional custom OpenFoodFacts API URL.
- `GROK_API_KEY` / `XAI_API_KEY`: Optional fallback for chat.

### 1.12 Capacitor / Android Configuration
- **Capacitor CLI & Core:** v8.5.1 configured in `mobile/capacitor.config.ts`:
  - `appId: 'com.foodscan.ai'`, `appName: 'FoodScan AI'`, `webDir: 'dist'`, `server.cleartext: true`.
- **Android Project:** `mobile/android/` present, targeting SDK 36 (`minSdk 24`, `targetSdk 36`).
- **Android Manifest:** Missing `<uses-permission android:name="android.permission.CAMERA" />`.

### 1.13 Vercel / Deployment Configuration
- Hosted at `https://food-scan-ai-one.vercel.app/`.
- Builds cleanly using root `vercel.json` and `npm run vercel-build`.
- Operates under Vercel Serverless Function limits: **10s execution timeout** and **4.5 MB request body limit**.

### 1.14 Existing Tests
- Zero unit or integration tests for backend routes, controllers, or vision analysis pipelines. Only basic Android test boilerplate in `mobile/android/app/src/test`.

### 1.15 Existing UI/UX
- Polished, mobile-first dark-mode UI with high contrast, clear visual cards, bottom navigation bar, macro breakdowns, confidence meters, and interactive portion sliders.

### 1.16 Performance Issues
- Base64 payloads increase image data transfer size by ~33% over HTTP.
- Synchronous multi-model loops in `aiVision.service.ts` can approach Vercel's 10-second timeout ceiling.

### 1.17 Security Issues
- In-memory rate limiting resets on every serverless cold start.
- Default fallback JWT secret allows token forging if `JWT_SECRET` is unset.

---

## 2. Food Scanning Flow Trace & Failure Points

```text
User 
  └─► Image 
        └─► Frontend 
              └─► API 
                    └─► Gemini 
                          └─► Food Identification 
                                └─► Nutrition Calculation 
                                      └─► Backend 
                                            └─► Frontend Result
```

### Detailed Flow Analysis:

| Stage | What Happens | What Breaks This Flow | Severity |
| :--- | :--- | :--- | :--- |
| **1. User → Image** | User takes camera photo or picks gallery image | High-resolution phone cameras (e.g. 12MP, 10MB) bypass client downscaling if picked from file picker without resizing, breaching Vercel's 4.5 MB body limit (HTTP 413). Sample fallback photos pass Unsplash URLs instead of Base64 strings. | 🔴 P0 / 🟡 P1 |
| **2. Image → Frontend** | Image is saved to Zustand `capturedImage` | If the user selects "Barcode Scanner", the frontend proceeds to screen 7, where the barcode string is hardcoded to `'737628064502'`. Live barcode decoding is never performed. | 🔴 P0 |
| **3. Frontend → API** | Axios sends `POST /api/scan/*` | On native Android APK, `client.ts` falls back to `https://cap-verification-deeply-appointed.trycloudflare.com/api` (dead URL). On Web, if the user logged in, `client.ts` sends `Authorization: Bearer demo_jwt_token_foodscan_2026`. `optionalAuth` rejects this invalid token with HTTP 401, breaking the scan. | 🔴 P0 |
| **4. API → Gemini** | Backend validates image & calls Gemini Vision | If `normalizeImageInput` receives an external sample URL without proper browser headers, the external host returns 403 Forbidden, throwing `Food image analysis failed`. If Gemini takes >10 seconds, Vercel cuts the lambda connection with HTTP 504. | 🔴 P0 / 🟡 P1 |
| **5. Food Identification** | Gemini returns structured JSON | In `aiVision.service.ts`, fallback model names `'gemini-3.5-flash'` and `'gemini-3.5-flash-lite'` do not exist in Google's API, causing 404 errors during model failover. | 🟡 P1 |
| **6. Nutrition Calculation** | Backend merges database items + AI estimate | Working properly. Math and nutritional normalization logic are sound. | 🟢 Working |
| **7. Backend → Storage** | Backend tries to save scan to `prisma.scanHistory` | If an auth token was present, `scan.controller.ts` calls `prisma.scanHistory.create()`. Prisma crashes with HTTP 500 because `DATABASE_URL` is missing and SQLite cannot write to serverless disks. | 🔴 P0 |
| **8. Backend → Frontend** | Axios returns analysis to Zustand | If any intermediate step fails, user is booted back to `IMAGE_PREVIEW` with an error message. | 🟢 Working |

---

## 3. Prioritized Issue Breakdown (P0 / P1 / P2)

### 🔴 P0 — Critical (Must Fix Before Launch)

1. **Prisma SQLite Incompatibility on Serverless (`DATABASE_URL` Missing)**
   - *File:* `backend/prisma/schema.prisma`, `backend/src/config/db.ts`
   - *Detail:* SQLite is an ephemeral disk file. On Vercel Lambdas, the filesystem is read-only. Calling `/api/auth/*` or saving scans triggers an immediate 500 crash.
2. **Hardcoded Barcode Scan in Screen 7**
   - *File:* `mobile/src/screens/7_ImagePreviewScreen.tsx` (line 75)
   - *Detail:* `await processBarcodeScan('737628064502');` unconditionally scans a fixed test barcode instead of running a client-side 1D/2D barcode reader.
3. **Invalid Mock Auth Token Breaks Scanning with 401**
   - *File:* `mobile/src/screens/3_AuthScreen.tsx` & `backend/src/routes/scan.routes.ts`
   - *Detail:* Logging in sets token to `'demo_jwt_token_foodscan_2026'`. The scan route's `optionalAuth` middleware attempts `jwt.verify()`, which fails and returns 401 Unauthorized, preventing authenticated users from scanning meals.
4. **Dead Cloudflare Tunnel URL in Mobile Client**
   - *File:* `mobile/src/api/client.ts` (`DEFAULT_API_URL`)
   - *Detail:* Hardcoded `https://cap-verification-deeply-appointed.trycloudflare.com/api` fails DNS resolution. On Android APKs, all requests fail with `NETWORK_FAILURE`.
5. **Sample Preset Image Rejection by Backend**
   - *File:* `backend/src/services/ai.service.ts` & `mobile/src/screens/6_CameraScreen.tsx`
   - *Detail:* Clicking sample presets sends external Unsplash URLs. Backend fetch fails or rejects with `"Base64 image data is required."`

---

### 🟡 P1 — Important (Should Fix Before Launch)

1. **Missing Camera Permission in `AndroidManifest.xml`**
   - *File:* `mobile/android/app/src/main/AndroidManifest.xml`
   - *Detail:* Only `INTERNET` permission is declared. Lacks `<uses-permission android:name="android.permission.CAMERA" />` and camera hardware features.
2. **Invalid Gemini Model Names in Failover Array**
   - *File:* `backend/src/services/aiVision.service.ts` (line 38)
   - *Detail:* Lists `'gemini-3.5-flash'` and `'gemini-3.5-flash-lite'`. Must be updated to valid aliases (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
3. **Vercel Serverless Function Execution Timeout (10s)**
   - *File:* `vercel.json`
   - *Detail:* Large images through multimodal Gemini can exceed 10s. Needs `maxDuration: 60` in `vercel.json`.
4. **Stateless In-Memory Rate Limiting**
   - *File:* `backend/src/app.ts`
   - *Detail:* In-memory rate limiting resets across lambda instances, allowing potential API abuse and Gemini billing spikes.
5. **No Automated Test Coverage**
   - *Detail:* Zero unit or integration tests for scan calculation pipelines or auth endpoints.

---

### 🟢 P2 — Improvement (Can Fix After Launch)

1. **Client-Side Scan History Offline Caching**
   - Cache scanned food items and reports locally in IndexedDB / Capacitor Preferences so users can review history offline.
2. **Per-Ingredient Nutrient Manual Override**
   - Allow users to manually adjust the grams and calories of individual ingredients in addition to scaling the whole meal.
3. **Export Dietary Logs**
   - Add CSV/PDF export for nutritional tracking.

---

## 4. Key Findings

- **Features That Are Already Working & MUST NOT Be Broken:**
  1. `POST /api/scan/meal` multimodal vision analysis and meal portion estimation.
  2. `POST /api/scan/quality` food surface defect and freshness inspection.
  3. `POST /api/scan/barcode` OpenFoodFacts & USDA product lookups (tested & verified).
  4. Interactive nutrition cards, macro charts, portion sliders (`scaleMealPortion`), and custom item addition.
  5. Live camera stream viewfinder with device camera flipping (`environment` vs `user`).
  6. `POST /api/chat` interactive AI clinical nutritionist assistant.
- **Duplicated / Unnecessary Code:**
  - Duplicate vision analysis pipelines in both `ai.service.ts` and `aiVision.service.ts`.
  - Duplicate sample image fallback logic in `6_CameraScreen.tsx` and `4_DashboardScreen.tsx`.
- **Hardcoded Values:**
  - Barcode: `'737628064502'` in `7_ImagePreviewScreen.tsx`.
  - Mock token: `'demo_jwt_token_foodscan_2026'` in `3_AuthScreen.tsx`.
  - Dead URL: `'https://cap-verification-deeply-appointed.trycloudflare.com/api'` in `client.ts`.
- **Exposed Secrets:**
  - **None in client bundle.** `GEMINI_API_KEY` is securely encapsulated on the server.
- **Scalability & Gemini Cost / Rate Limits:**
  - Identical food photo scans re-invoke Gemini without caching. An image SHA-256 hash cache will save 30–40% on API costs.
- **Android / Play Store Blockers:**
  - Missing `<uses-permission android:name="android.permission.CAMERA" />`.
  - Missing Capacitor hardware back button event listener (`App.addListener('backButton')`).

---

## 5. Recommended Production Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Unified Frontend & Mobile App                        │
│  - React 18 + Vite + Tailwind CSS                                      │
│  - Capacitor Native Bridge (Camera, Haptics, Preferences)              │
│  - Client Barcode Scanner (BarcodeDetector API / @zxing/library)       │
│  - Persistent API BaseURL (LocalStorage / VITE_API_URL / Relative)     │
│  - Client-side Canvas Image Compression (< 1.2 MB JPEG)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ HTTPS (Bearer JWT / Base64)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Production Backend API (Cloud / Vercel)              │
│  - Express.js API Layer with Vercel maxDuration: 60                    │
│  - Gemini Multimodal Vision Engine (@google/generative-ai)             │
│  - OpenFoodFacts / USDA Database Lookup Fallback                       │
│  - Input Image Hashing (SHA-256) & Cache (Prevents duplicate API burn) │
│  - Persistent Cloud Database (Cloud PostgreSQL / Supabase / Firestore) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Step-by-Step Implementation Roadmap

1. **Phase 1: Critical Scanning Flow Stabilization**
   - Fix barcode scanning by integrating real client-side barcode reading from the camera frame.
   - Eliminate the dead Cloudflare URL in `client.ts` and ensure reliable API URL resolution.
   - Fix sample image handling by pre-converting preset URLs to Base64 in the frontend before dispatch.
2. **Phase 2: Authentication & Database Persistence**
   - Configure a persistent cloud database provider (PostgreSQL / Supabase / Firestore) or add graceful fallback when database operations are unavailable.
   - Connect real JWT registration and login flows in `3_AuthScreen.tsx` to eliminate the fake mock token that triggers 401 scan errors.
3. **Phase 3: Gemini Optimization & Payload Safeguards**
   - Correct model names in `aiVision.service.ts` to active Gemini aliases.
   - Configure `maxDuration: 60` in `vercel.json` to prevent 10s gateway timeouts.
   - Enforce client-side image compression down to max 1200px width/height and < 1.2 MB before transmission.
4. **Phase 4: Mobile App & Android Hardening**
   - Add `<uses-permission android:name="android.permission.CAMERA" />` and hardware camera features to `AndroidManifest.xml`.
   - Add Capacitor hardware back button navigation listener.

---

## 7. The Exact First 3 Fixes to Implement After Approval

1. **Fix 1: Implement Real-Time Client-Side Barcode Detection & Remove Hardcoded Barcode**
   - In `mobile/src/screens/6_CameraScreen.tsx` and `7_ImagePreviewScreen.tsx`, replace the hardcoded `'737628064502'` barcode with active frame decoding using the HTML5 `BarcodeDetector` API (with `@zxing/library` fallback), feeding actual scanned barcodes into `/api/scan/barcode`.
2. **Fix 2: Fix API Client Base URL & Remove Dead Cloudflare Fallback**
   - In `mobile/src/api/client.ts`, purge `https://cap-verification-deeply-appointed.trycloudflare.com/api`. Ensure `getApiBaseUrl()` defaults cleanly to `/api` on web, loads custom URLs from `localStorage`, and supports production backend endpoints on native mobile.
3. **Fix 3: Fix Auth Flow & Prevent 401 Scan Rejections**
   - In `mobile/src/screens/3_AuthScreen.tsx`, wire `handleSubmit` to call `/api/auth/login` and `/api/auth/register` to receive valid JWT tokens. If offline or unauthenticated, store a clean guest state with `token: null` so that `optionalAuth` on scan routes does not reject requests with 401 Unauthorized.
