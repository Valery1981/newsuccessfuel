---
description: APEX 2026-05-15-09 — Compléter la couverture des tests E2E (auth, onboarding, shifts, POS, rapports)
argument-hint: <aucun — lancer directement>
priority: 🟡 MOYENNE
---

<objective>
Tests E2E actuels : `e2e/auth/`, `e2e/admin/validation-station`, `e2e/first-login`, `e2e/database/`.
Manquants : onboarding complet, shifts carburant, POS boutique, rapports, opérations hors A&V, partenaire.

Guide §16 : tests obligatoires + processus fin de session.

Objectif : suite Playwright complète couvrant les parcours critiques.
</objective>

<context>
Fichiers à analyser :
- playwright.config.ts
- e2e/* existants
- e2e/fixtures/auth.fixture.ts
- guide/Guide_Document_SuccessFuel.md §16

Parcours critiques à couvrir :
1. Inscription gérant → onboarding 6 étapes → dashboard
2. Calibrage cuves (3 règles validées)
3. Initialisation entreprise → validation irréversible
4. Achat carburant 4 onglets → mouvementer → comptabiliser
5. Shift carburant : pompiste saisit → superviseur clôture
6. POS boutique : ouverture → vente → clôture
7. Inventaire carburant → régularisation
8. Création doléance gérant → réception partenaire
9. Création session employé → first-login → permissions
10. Rapports : génération + export CSV
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lister specs existantes
2. Identifier fixtures réutilisables (auth, seed data)
3. Vérifier disponibilité de seed data Supabase (test environment)

## ÉTAPE 2 — PLAN
Créer specs :
- e2e/onboarding/full-onboarding.spec.ts
- e2e/onboarding/calibrage-rules.spec.ts
- e2e/manager/initialisation.spec.ts
- e2e/manager/achat-carburant.spec.ts
- e2e/manager/shift-carburant.spec.ts
- e2e/manager/pos-boutique.spec.ts
- e2e/manager/inventaire.spec.ts
- e2e/manager/doleances.spec.ts
- e2e/manager/sessions-permissions.spec.ts
- e2e/partner/dashboard-kpis.spec.ts
- e2e/rapports/exports.spec.ts

## ÉTAPE 3 — EXECUTE
1. Étendre fixtures (créer entreprise+station+cuves de test via Supabase admin)
2. Cleanup après chaque spec
3. Utiliser `test.skip` + variable env pour les specs nécessitant du seed lourd

## ÉTAPE 4 — VALIDATE
- [ ] `npm run test:e2e` passe sur toutes les specs
- [ ] Couverture parcours critiques 100%
- [ ] CI verte
</process>

<rules>
- Aucune donnée de prod
- Cleanup obligatoire (afterEach)
- test.skip + env var quand credentials réels nécessaires
- Tous les textes en FRANÇAIS
</rules>
