<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Tests (obligatoire pour chaque nouvelle fonctionnalité)

- Ajouter au moins **un test unitaire** (Vitest) couvrant la logique métier ou les schémas concernés.
- Ajouter au moins **un test e2e** (Playwright) pour le parcours utilisateur principal ; utiliser `test.skip` + variable d’environnement si des identifiants réels sont nécessaires.
- Scripts : `npm run test` (unit), `npm run test:e2e` (e2e).

---

## Processus de Fin de Session — OBLIGATOIRE

**À la fin de CHAQUE session de travail, avant de faire `git add commit push` :**

1. **Tests unitaires** : `npm run test` (Vitest)
2. **Tests E2E** : `npm run test:e2e` (Playwright)
3. **Linting** : `npm run lint` (ESLint) — doit être 0 erreur
4. **TypeScript** : `npx tsc --noEmit` — doit être 0 erreur
5. **Build** : `npm run build` — doit réussir

**SEULEMENT après que tous les checks passent :**

- `git add .`
- `git commit -m "description"`
- `git push`

Cette règle est NON NÉGOCIABLE et s'applique à TOUTES les modifications, même mineures.
