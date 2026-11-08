# TRENERKI Academy v0.7.0 — Expo Hosting + Supabase

Production preview: **https://trenerki-academy.expo.app**

## Website layout

The Expo web root (`app/index.tsx`) opens the original **TRENERKI Academy HTML design** from `public/academy/index.html`. The original layout, CSS, hero illustration, course cards, filtering, mobile styles, vector icons and course preview screens have been restored. This file contains **only public course metadata**, not paid lessons, quiz solutions or answer keys. The public catalog synchronizes titles, descriptions and prices from Supabase; it retains a public-only static fallback during an API outage.

Legal pages are available under `public/academy/`: `regulamin.html`, `prywatnosc.html` and `certyfikaty.html`. They are pre-launch drafts with clear disclosures; before charging consumers, the legally required operator identification and finalized policies must be supplied.

## v0.7.0 — purchase funnel and expanded catalog

- 34 courses are in the public catalog; 15 original + 19 newly requested courses.
- Each course offers **Poznaj kurs** (public eight-module outline) and **Kup kurs** (redirects to `/konto?course=<slug>&next=kup`).
- Successful login or an existing authenticated session with a selected course redirects to `/kup?course=<slug>`, where the user sees course, price and purchase button.
- Two shortcuts mini-courses (Excel / AutoCAD) cost **10 PLN each**; **Uprawnienia Świętego Mikołaja** is explicitly fun and free, without formal qualifications.
- Free course signup uses authenticated Supabase Edge Function `ta-enroll-free`, which checks server-side that price is actually zero before granting a 12-month enrollment.
- Paid purchase invokes `ta-create-checkout` with a price read from Supabase, an authenticated/verified user, and explicit digital-content consents. Stripe payment cannot complete until required server secrets, legal details and webhook verification are configured.
- Supabase has 272 lesson entries (34 x 8). Several new courses currently have **draft lesson outlines**, not completed professionally reviewed content; do not market them as fully finished or charge for them yet.
- Prices for the 16 new full courses are **working proposals**, not owner-approved final prices. Only Excel = 10 PLN, AutoCAD = 10 PLN, and Santa = gratis were explicitly specified.
- The original static HTML design is preserved. Frontend code has **no simulated purchases** and no paid material in the public bundle.

## Authentication and protected content

- `/konto`: email/password registration, verification, login, login errors, session detection, password-reset form and changing password from an authenticated session. The site never creates local mock purchases.
- `/moje-kursy`: fetches this user's enrollments and progress.
- `/nauka`: gated by a live, paid enrollment; reads lesson content under Supabase RLS.
- Supabase project `kcvvixcjuwglfvdpypzs`; publishable client key only. No `service_role`, Stripe or Resend secret in public code.
- 15 published courses and 120 lessons are present in Supabase; payment remains unavailable in the frontend by design. A signed payment webhook must be tested before live charging.

### Outstanding account configuration

Supabase's Authentication **URL Configuration** is stored in its Management settings, **not Postgres tables**. Configure these settings with an account-management capability before promoting to production:

- **Site URL:** `https://trenerki-academy.expo.app`
- **Redirect URL:** `https://trenerki-academy.expo.app/konto`

The connected Supabase integration supports database, functions and logs but currently does not provide an action to write project Auth URL settings. No backend change should falsely claim to have modified them. Some confirmation/recovery emails may still redirect to `localhost` until this project configuration is actually changed. This limitation is separate from `invalid_credentials`, which is returned when login email/password does not match. Already logged-in users may continue through the session prompt in `/konto` without resubmitting a password.

## Deploy

`.eas/workflows/deploy-web.yml` automatically deploys the Expo project to the production hosting URL on pushes to `main`.

```sh
npm install
npx expo export --platform web
npx eas-cli@latest deploy --prod
```

## Pre-launch checklist

- Verify final Expo workflow status, root redirect, catalog rendering and public legal pages in a browser.
- Confirm Supabase Auth Site URL and redirect allow list, signup email confirmation, password recovery, and cross-device sessions.
- Add actual business identity and approved legal policies before paid sales.
- Add and test Stripe/Resend server secrets and authenticated payment webhook before enabling checkout.
- Implement server-verified quizzes/exams and certificate issue/verification before selling them; do not expose answer banks to the browser.

_7 November 2026 — original HTML design restored with public catalog and server-protected private materials._
