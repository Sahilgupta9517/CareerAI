# React + TypeScript + Vite

## Supabase setup

Create a `.env` file in this folder using `.env.example` and add the Supabase project URL and publishable key. Never add a `service_role` key to the frontend.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

The `public.profiles` table must allow an authenticated user to insert a row containing its own `user_id`. The app creates that row immediately after signup; onboarding can fill in the remaining profile details.

Apply `supabase/migrations/20260821000000_create_roadmap_progress.sql` in the Supabase SQL Editor before using roadmap status persistence. It creates the progress table, status constraint, timestamps, and profile-scoped RLS policies.

Deploy the secure career analysis function from the project root with the Supabase CLI:

```bash
supabase functions deploy career-analysis
supabase secrets set AI_API_KEY=your_server_side_provider_key AI_API_URL=https://api.openai.com/v1/chat/completions AI_MODEL=gpt-4o-mini
```

`AI_API_KEY` is read only by `supabase/functions/career-analysis/index.ts`; it must never be added to frontend `.env` files or `VITE_*` variables.

Run the app with:

```bash
npm install
npm run dev
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
