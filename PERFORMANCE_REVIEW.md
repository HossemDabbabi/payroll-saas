# PayrollPro Performance and Code Review

**Date:** 2026-11-08  
**Scope:** Available frontend production build, unauthenticated browser flows, and focused static review of payroll/API startup paths.

## Executive summary

The login and registration UI rendered successfully in the available frontend build. At a 390 px viewport, the login page had no horizontal overflow. The local browser run cannot establish production or backend performance: it used a prebuilt frontend served by Python, without the API or MongoDB. An attempted login received HTTP 501 from that static server, and the UI displayed its generic login error as expected.

The clearest performance opportunity is route-level code splitting. The available build ships one 589,807-byte JavaScript bundle (about 172 KB gzip) to the login page, while `App.jsx` eagerly imports all customer and admin pages, including Chart.js dashboards. There is also an unbounded page-size parameter on the payroll listing endpoint.

## Test results

| Check | Result | Evidence / limitation |
|---|---|---|
| Login page renders | Pass | PayrollPro heading, email/password fields, and sign-in button were visible. |
| Registration navigation | Pass | The in-app link opened the registration form. |
| Empty registration validation | Pass | Browser validation blocked submission with all four required fields empty. |
| Mobile login layout | Pass | At 390 × 844, document and body widths were 390 px; no horizontal overflow. |
| Frontend JavaScript exceptions | Pass | No uncaught page errors observed during page load. |
| Login API flow | Not verified | The local static server returned HTTP 501 for `POST /api/auth/login`; the frontend displayed its generic failure message. No backend or database was running. |
| Playwright CLI suite | Not run | `npx playwright test ...` exited 127 because Node/npm are not available on this environment's PATH. |
| Backend unit tests / load tests | Not run | Node/npm and a running MongoDB/API were unavailable. |

## Performance measurements

Measurements are from the locally served, already-built `frontend/dist` snapshot, not a deployed site or a rebuild of current source. Navigation timing was approximately 7 ms to response, 73 ms to DOMContentLoaded, and 82 ms to load completion. First Contentful Paint was approximately 244 ms in the integrated browser. Resource Timing reported zero transfer bytes, consistent with cached/local resources, so these navigation values are not representative of a cold network visit.

| Asset | Raw size | Gzip estimate |
|---|---:|---:|
| JavaScript | 589,807 bytes | 172,296 bytes |
| CSS | 59,717 bytes | 9,141 bytes |

The frontend is emitted as a single JS asset in this build. The login page therefore downloads code for unrelated routes before the user needs it.

## Code review findings

### P2: All frontend routes are eagerly bundled

[App.jsx](frontend/src/App.jsx) statically imports every customer and admin page. The dashboard pages import Chart.js, so these modules are part of the one 590 KB raw JavaScript asset observed in the build. This increases initial download and parse work for login and registration, especially on slower devices.

**Recommendation:** Apply `React.lazy` and `Suspense` at route boundaries, especially for admin and dashboard pages, then rebuild and compare cold-load compressed size and LCP.

### P2: Payroll listing accepts an unbounded page size

[payroll.controller.js](backend/src/controllers/payroll.controller.js) parses `page` and `limit` directly from query parameters and passes them to MongoDB without checking positivity, integer validity, or a maximum. A large `limit` can make one authenticated request read and serialize every matching payroll summary; malformed values can also cause database errors.

**Recommendation:** Validate both parameters as positive integers, clamp `limit` to a small maximum (for example 100), and return a 400 response for invalid values. Add tests for missing, negative, non-numeric, and oversized values.

### P2: Payroll parser references an undefined option

[payroll.service.js](backend/src/services/payroll.service.js) defines `readOptions` but calls `XLSX.readFile(filePath, raw)`, where `raw` is not defined. The `ReferenceError` is caught and the file is read again via the fallback call, so normal files may still process, but every upload takes an unnecessary exception path and the intended read options are never applied.

**Recommendation:** Pass `readOptions` to `XLSX.readFile`, and add a test that parses a representative CSV and XLSX file through the normal first attempt.

### P2: HTTP server starts before database initialization completes

[server.js](backend/src/server.js) starts `connectDB()` asynchronously and calls `app.listen()` immediately afterward. During a slow database startup, the API can accept requests before MongoDB is ready; the health endpoint can also appear healthy while database-backed routes are not ready.

**Recommendation:** Await database connection and the admin integrity check before listening, and expose readiness separately from liveness if container orchestration is used.

## Recommended order

1. Fix and test the undefined XLSX option; it is a simple deterministic defect.
2. Validate and cap payroll listing pagination.
3. Gate API startup on database readiness.
4. Split frontend routes and compare cold-load metrics on desktop and mobile.
5. Run the full Playwright suite against a test backend/database, then run a repeatable load test with documented dataset and concurrency.

## Reproduction notes

The browser checks used the existing `frontend/dist` snapshot at `http://127.0.0.1:8000`. The test account was not used. To validate actual authentication and backend behavior, run the app with Node/npm and MongoDB, configure a disposable test account, and run `npx playwright test --project=chromium`. For a representative cold-load performance result, rebuild the frontend and test through the production Nginx setup with cache disabled and a documented network profile.