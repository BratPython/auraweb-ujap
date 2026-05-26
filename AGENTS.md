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

## Supabase MCP (required for DB access)

Supabase MCP config lives at `~/.config/opencode/opencode.json`. The URL must include feature flags:

```json
{
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=tmvntnwcdtqqeeeskfzo&features=docs%2Cdatabase%2Cdebugging%2Cstorage",
      "enabled": true
    }
  }
}
```

Authenticate once with `opencode mcp auth supabase`.

Agent skills are installed at `.agents/skills/supabase/` and `.agents/skills/supabase-postgres-best-practices/`.

## Environment Variables

Create `.env` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PAYPAL_CLIENT_ID=...
VITE_STRIPE_PUBLISHABLE_KEY=...
```

## Database Schema

### perfiles table (auth users)
| Column | Notes |
|--------|-------|
| `id` (uuid) | **This IS auth.uid()** — there is no `user_id` column |
| `email` (text) | |
| `rol` (text) | `'admin'` grants admin access |
| `creado_en` (timestamptz) | |

Admin RLS checks:
```sql
EXISTS (SELECT 1 FROM perfiles WHERE perfiles.id = auth.uid() AND perfiles.rol = 'admin')
```

### landing_video_settings (video feature)
Stores video URLs for the landing page. One row only. Admin RLS for write, public read when `is_enabled = true`.

## Storage (recursos_aura bucket)

Bucket is public. Storage RLS must allow **all CRUD operations** on `storage.objects` — INSERT alone is not enough because `upload({ upsert: true })` needs INSERT + SELECT + UPDATE + DELETE. Without full policies, uploads fail with "new row violates row-level security".

Files for the landing video go under `landing-video/` folder.

## Stripe Backend Setup

Stripe requires a secret stored in Supabase Vault:

```sql
select vault.create_secret('sk_test_xxx', 'stripe_secret_key', 'Stripe secret key for AuraWeb checkout');
```

The checkout function reads the most recent secret by date. Rotation works by creating a new secret with the same name.

## Project Stack

- React 19 + Vite 7
- Supabase (auth + database + storage)
- Stripe + PayPal (real payment integration)
- React Router 6
- ESLint 9 (flat config)

## Architecture

- **Entry**: `src/main.jsx` → `src/App.jsx` (BrowserRouter + providers)
- **Admin**: Detected via `useAdminMode()` hook → checks `perfiles.rol = 'admin'`. Admin quickbar lives in `src/components/layout/Header.jsx`, not a separate layout component.
- **Landing**: `src/components/landing/Landing.jsx` composes HeroSection, VideoPlayerSection, DiscoverSection, CatalogCta, ServicesSection.
- **Video feature**: `VideoSettingsModal.jsx` (admin upload UI) + `VideoPlayerSection.jsx` (public player with play/pause, volume, audio track selector, subtitle selector).