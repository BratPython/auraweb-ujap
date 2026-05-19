# AuraWeb Development Guide

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (http://localhost:5173, port may vary) |
| `pnpm build` | Production build to `dist/` |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Preview production build |

## Important Constraints

- **Must use pnpm** — npm is explicitly forbidden
- **No TypeScript** — this is a plain JavaScript project

## pnpm Setup

`pnpm-workspace.yaml` must have `allowBuilds` configured for build scripts to work:

```yaml
allowBuilds:
  core-js: true
  esbuild: true
```

Without this, pnpm 11+ blocks postinstall scripts and the dev server fails.

## Environment Variables

Create `.env` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PAYPAL_CLIENT_ID=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

## Stripe Backend Setup

Stripe requires a secret stored in Supabase Vault:

```sql
select vault.create_secret('sk_test_xxx', 'stripe_secret_key', 'Stripe secret key for AuraWeb checkout');
```

The checkout function reads the most recent secret by date. Rotation works by creating a new secret with the same name.

## Project Stack

- React 19 + Vite 7
- Supabase (auth + database)
- Stripe + PayPal (real payment integration)
- React Router 6
- ESLint 9 (flat config)

## Entry Points

- Dev entry: `vite.config.js`
- App entry: `src/main.jsx` (or `index.jsx`)
- Routing: `src/App.jsx` or `src/index.jsx`