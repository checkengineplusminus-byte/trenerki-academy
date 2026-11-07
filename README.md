# TRENERKI Academy · Expo Web & Supabase foundation

**Prototype / not production-ready.** The preserved legacy demo is in `public/academy/`; it has local demo logic and is NOT used as a trusted production exam system.

Project includes Expo Router, registration and login form (`/konto`), library (`/moje-kursy`), cross-device saved notes (`/nauka`), RLS-ready SQL schema, Stripe checkout and signed webhook handlers, transactional Resend email stub.

- `npm install`
- Copy `.env.example` to `.env` and fill PUBLIC keys from the NEW, separate Supabase project.
- `npm run web`
- `npm run export:web` to create static output
- `npx eas-cli@latest deploy` once Expo project is authenticated and ready.

See `docs/SETUP_SUPABASE_RESEND.md`. Never upload paid answer banks or secret keys to public repositories. Never share service role key with frontend.