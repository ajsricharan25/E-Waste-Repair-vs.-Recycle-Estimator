# Second Life — Repair vs. Recycle Estimator

A responsive web app that helps people decide what to do with broken electronics. Describe the symptoms, compare indicative repair costs with material recycling value, and take a practical next step.

## Run locally

Requires Node.js 24 and npm. The local estimator and component-specific Maps searches work without an API key, database, or account. Web answers require the server-side AI key described below.

```sh
npm ci
npm run dev
```

Vite serves the app on port 5173. Run `npm run build` to create the production files in `dist`, then `npm run preview` to serve that build on port 4173.

In a cloud sandbox with a read-only home directory, use a writable npm cache:

```sh
npm ci --cache /workspace/.npm-cache
```

## What works

- Six device categories: washing machines, refrigerators, laptops, smartphones, televisions, and microwaves.
- Photo selection, drag-and-drop, preview, replacement, and removal. JPEG, PNG, and WebP files are decoded and validated, with an 8 MB limit.
- Symptom suggestions and free-text entry, device age, optional replacement budget, and INR or USD estimates.
- Symptom-based possible causes and repair, recycle, or professional-inspection recommendations.
- Indicative parts/labor ranges, material recovery breakdowns, and safe external checks.
- Hazard detection for symptoms such as smoke, sparks, swollen batteries, and exposed wiring. These cases recommend professional handling instead of routine troubleshooting.
- Component-specific Google Maps searches using the user's city or postcode, such as “washing machine drain pump repair in Bengaluru.” Users can edit the service before searching.
- Optional web research for published repair guidance and pricing, with inline source links and a checked date. Brand/model and location help make the search relevant.
- Up to 30 saved estimates in browser storage, reopening/deletion, and downloadable text reports.
- Mobile navigation, keyboard-accessible controls, and bundled fonts.

## Current boundaries

This first version uses deterministic symptom matching, **not AI image diagnosis**. Photos stay in browser memory for reference, are never sent to a server, and are not retained in saved estimates or reports. Saved symptom descriptions remain in this browser's local storage until deleted or browser data is cleared.

Prices, material weights, recovery rates, and expected service life are **illustrative planning assumptions**, not live data. INR and USD use independent price profiles, not an exchange-rate conversion. Recycling ranges apply recovery assumptions to estimated material value; collection and processing fees can reduce a payout to zero. Batteries and refrigerant recovery are excluded from the material calculation.

Shop search opens Google Maps. There is no verified shop directory, availability feed, or live quote integration. Users contact businesses themselves. Unknown or conflicting symptoms produce an inspection recommendation; an exact model, professional diagnosis, and written quote are needed before a decision.

Web research is separate from the illustrative repair/recycling calculation. It does not overwrite the numerical comparison. A published price can be conditional, parts-only, geographically different, or outdated; confirm the model and full price with a repairer. Research answers are currently kept only while viewing the assessment and are not included in saved estimates or text downloads. Changing the service, device details, or location clears the previous web answer.

## Enable web research

The server calls OpenAI's Responses API with its web-search tool. The only tool available to the model is web search. Photos are not sent. Research runs only when the user selects **Research this repair**, after the app explains which details will be sent.

1. Configure `REPAIR_AI_API_KEY` securely in the server environment. For local development, copy `.env.example` to `.env.local` and supply your key there. Never commit the key or use a `VITE_` prefix, which would expose it to the browser.
2. Optionally set `REPAIR_AI_MODEL` to a model supporting Responses API web search; the default is `gpt-4.1`.
3. Restart Vite locally, or redeploy after adding the variable in Vercel's project environment settings. Existing server-side `OPENAI_API_KEY` bindings are also supported.

`POST /api/research` accepts bounded device details, symptoms, brand/model, repair service, and location. The server requires a completed web search and usable HTTPS source citations before returning an answer. Requests have body-size and time limits; errors are sanitized and secrets never enter the client bundle. Missing credentials return `503 not_configured`; the UI offers a direct web-search link instead of fabricating an answer. Provider/API usage is billed to the configured account.

The built-in six-requests-per-minute burst guard is **process-local**, so it is not a distributed quota across Vercel instances. Configure Vercel Firewall rate limiting or equivalent deployment protection and provider spending limits before enabling the paid endpoint publicly. Same-origin validation is an additional browser check, not authentication.

Vite serves the API middleware during `dev` and `preview`. On Vercel, `api/research.ts` runs as a Node.js Function. Deploying only the `dist` directory to a static host will not provide web research.

## How recommendations work

The model in `src/lib/estimator.ts` maps symptoms to common possible faults. It compares the midpoint repair estimate with the replacement budget and typical remaining service life:

- Repair is suggested when the midpoint is at most 40% of replacement cost and there are at least two assumed years remaining.
- Recycling is worth considering when repair reaches 60% of replacement cost, or the device has at most one assumed year remaining and repair reaches 25%.
- Other cases, unknown or conflicting symptoms, and hazardous symptoms require inspection.

These thresholds are product assumptions, not a diagnosis or a reason to discard an otherwise repairable device. The app explains its uncertainty and asks users to confirm quotes before retiring equipment.

## Checks

```sh
npm test                 # Estimator behavior, safety handling, and input validation
npm run typecheck        # TypeScript
npm run build            # Type check and production bundle
npm run format:check     # Formatting
npx playwright install chromium
npm run test:e2e         # Desktop and mobile user flows
```

To reuse a system Chromium installation in this cloud environment:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

The browser suite starts Vite automatically. Tests verify the displayed results, safety guidance, currencies, photo errors, saved estimates across reloads, report downloads, component-specific search URLs, dialog behavior, responsive layouts, research error handling, source rendering, and stale-answer clearing. Research provider responses and Map searches are intercepted in automated tests; these checks do not establish live AI accuracy, current prices, or shop availability. GitHub Actions runs the build and test suite on pushes and pull requests.

## Vercel deployment

The repository contains a `vercel.json` configuration for the Vite frontend plus a Node.js research function:

| Setting   | Value           |
| --------- | --------------- |
| Framework | Vite            |
| Node.js   | 24.x            |
| Install   | `npm ci`        |
| Build     | `npm run build` |
| Output    | `dist`          |

Once these changes are pushed to GitHub, import the repository into a Vercel project and deploy. Set `REPAIR_AI_API_KEY` in the project environment settings to enable web research; otherwise the estimator, manual web search, and targeted Maps searches remain available. The research function allows up to 60 seconds; its provider request timeout is 25 seconds. Development and saved estimates are independent of a Vercel account. A local production build does not publish the app.

## Project structure

```text
src/App.tsx                         Application flows and pages
src/styles.css                      Responsive interface styles
src/components/DeviceIllustration.tsx  Device artwork
src/lib/estimator.ts                 Symptom rules, estimates, and safe guidance
src/lib/estimator.test.ts            Model regression tests
src/lib/storage.ts                  Defensive local estimate storage
src/lib/service-search.ts           Component-specific Maps/web searches
src/components/WebResearchPanel.tsx Cited web answers and failure handling
server/research.ts                  Validated server-side web research
api/research.ts                     Vercel Function entry point
tests/app.spec.ts                   Browser workflow tests
tests/research.spec.ts              Mocked web-research and targeted Maps flows
```

Future integrations can add server-side photo analysis, model-specific parts pricing, verified repair-shop quotes, and regional recycling rates. Keep provider credentials on the server and obtain consent before sending photos to an external service.
