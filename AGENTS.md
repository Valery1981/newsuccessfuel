<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tests (obligatoire pour chaque nouvelle fonctionnalité)

- Ajouter au moins **un test unitaire** (Vitest) couvrant la logique métier ou les schémas concernés.
- Ajouter au moins **un test e2e** (Playwright) pour le parcours utilisateur principal ; utiliser `test.skip` + variable d’environnement si des identifiants réels sont nécessaires.
- Scripts : `npm run test` (unit), `npm run test:e2e` (e2e).
