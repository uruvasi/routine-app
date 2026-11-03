# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

---

# Routine App — cloud sync operations

## One-time setup

```bash
npx wrangler d1 create routine-app-db          # put database_id into wrangler.toml
npx wrangler d1 create routine-app-db-staging  # put database_id into [env.preview]
# Pages → Settings → Variables and Secrets: SETUP_PASSPHRASE (different values for Production and Preview)
```

The GitHub `CLOUDFLARE_API_TOKEN` needs D1 edit permission (migrations run in CI).

- Production: `https://rt.kazusa.org` (passkey RP ID `rt.kazusa.org` — never change it)
- Staging: push to `staging` → `https://staging.routine-app-bpz.pages.dev` (separate D1 and passkeys)

## Local development

```bash
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply routine-app-db --local
npm run build && npx wrangler pages dev dist   # http://localhost:8788
npm test
```

## Lost every passkey and the recovery code

Set a new recovery code directly in D1, then sign in with it and add a passkey.
User and routines stay as they are (foreign keys make deleting the user a bad idea).

```bash
CODE=ABCD-EFGH-JKLM-NPQR   # pick 16 chars from A-H J-N P-Z 2-9, grouped by 4
HASH=$(printf %s "$CODE" | shasum -a 256 | cut -d' ' -f1)
npx wrangler d1 execute routine-app-db --remote --command "UPDATE recovery_codes SET code_hash = '$HASH'"
# In the app: 復旧コードでログイン → enter $CODE → note the new code → パスキーを追加
```
