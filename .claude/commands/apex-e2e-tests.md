---
description: APEX — Implémenter les tests E2E Playwright (auth, onboarding, vente carburant, POS boutique, rapports)
argument-hint: <aucun — lancer directement>
---

<objective>
Selon §16 du Guide Document et AGENTS.md, les tests E2E Playwright sont OBLIGATOIRES.
Seul le fichier e2e/first-login.spec.ts existe actuellement.
Implémenter une suite complète de tests E2E couvrant les flux utilisateur critiques.
Les tests avec identifiants réels doivent utiliser test.skip + variable d'environnement.
Les tests doivent être reproductibles, isolés et ne pas toucher à la base de données de production.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §16 "TESTS — OBLIGATOIRES"
- AGENTS.md (règles tests Vitest + Playwright)
- e2e/first-login.spec.ts (seul test E2E existant — pattern à suivre)
- playwright.config.ts (configuration existante)
- src/app/(auth)/ (pages auth)
- src/app/(onboarding)/ (pages onboarding)
- src/app/(manager)/ (pages manager)
- vitest.config.ts (pour comprendre la séparation unit/e2e)

Flux à couvrir en E2E :
1. Authentification : login gérant → redirect /manager/dashboard
2. Authentification : login partenaire → redirect /partner/dashboard
3. Authentification : login superadmin → redirect /admin/dashboard
4. Authentification : mauvais mot de passe → message d'erreur
5. Onboarding : signup → company → station → cuves → pistolets → boutique → validation
6. Vente carburant : clôturer un shift → vérifier mouventation → comptabiliser
7. POS boutique : ouvrir shift → vendre article → clôturer shift → comptabiliser
8. Achat carburant : créer BC → paiement → réception → mouvementer → comptabiliser
9. Rapports : accéder Grand Livre → filtrer par période → vérifier données
10. Admin : valider une station en attente
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire e2e/first-login.spec.ts pour comprendre le pattern exact (fixtures, test.skip, variables d'env)
2. Lire playwright.config.ts pour la configuration (baseURL, browsers, timeout)
3. Vérifier si des fixtures de test (données seed) existent pour la DB de test
4. Analyser les pages auth pour identifier les sélecteurs CSS/data-testid à utiliser
5. Vérifier si Supabase local (docker) est configuré pour les tests E2E

## ÉTAPE 2 — PLAN
Structure des tests :
```
e2e/
├── first-login.spec.ts           # Existant
├── auth/
│   ├── login.spec.ts             # Tests connexion tous rôles
│   └── signup.spec.ts            # Inscription gérant
├── onboarding/
│   └── onboarding-flow.spec.ts   # Flux complet onboarding
├── manager/
│   ├── vente-carburant.spec.ts   # Shift carburant complet
│   ├── achat-carburant.spec.ts   # Achat carburant 4 onglets
│   ├── pos-boutique.spec.ts      # POS boutique complet
│   └── rapports.spec.ts          # Accès et filtres rapports
├── admin/
│   └── validation-station.spec.ts  # Validation stations
└── fixtures/
    ├── seed-test-data.ts          # Données de test réutilisables
    └── auth.fixture.ts            # Fixture d'authentification
```

## ÉTAPE 3 — EXECUTE
Pattern de base pour chaque test (avec test.skip si credentials requis) :
```typescript
import { test, expect } from '@playwright/test'

const TEST_CREDENTIALS = {
  gerant: {
    email: process.env.TEST_GERANT_EMAIL ?? '',
    password: process.env.TEST_GERANT_PASSWORD ?? '',
  }
}

test.describe('Authentification Gérant', () => {
  test.skip(!TEST_CREDENTIALS.gerant.email, 'Credentials de test non configurés')

  test('login gérant → redirect dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.gerant.email)
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.gerant.password)
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL(/\/manager\/dashboard/)
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible()
  })
})
```

Ordre d'implémentation :
1. fixtures/auth.fixture.ts (helper login réutilisable)
2. auth/login.spec.ts (4 cas : gérant, partenaire, admin, mauvais pwd)
3. auth/signup.spec.ts (inscription gérant)
4. manager/rapports.spec.ts (le plus simple — pas de mutations)
5. manager/vente-carburant.spec.ts (clôture shift)
6. manager/pos-boutique.spec.ts (POS complet)
7. manager/achat-carburant.spec.ts (4 onglets)
8. admin/validation-station.spec.ts
9. onboarding/onboarding-flow.spec.ts (le plus long)

Ajouter data-testid aux composants manquants :
- Login form : data-testid="email-input", "password-input", "login-button"
- Dashboard : data-testid="dashboard-title"
- Shift form : data-testid="shift-form", "index-final-input", "cloture-button"
- POS : data-testid="pos-search", "add-to-cart-[id]", "checkout-button"

## ÉTAPE 4 — VALIDATE
- [ ] npm run test:e2e exécute sans erreur (avec test.skip si pas de credentials)
- [ ] Tests d'auth couvrent les 3 rôles + cas d'erreur
- [ ] Tests de rapports vérifient que les pages chargent et affichent des données
- [ ] Pas de test qui modifie la base de production
- [ ] Variables d'environnement documentées dans .env.example
- [ ] playwright.config.ts configuré avec webServer (auto-start dev server)
- [ ] Tous les sélecteurs utilisent data-testid (pas de sélecteurs CSS fragiles)
</process>

<rules>
- JAMAIS utiliser la base de données de production pour les tests
- Toujours test.skip si des identifiants réels sont requis
- Variables d'environnement : TEST_GERANT_EMAIL, TEST_PARTENAIRE_EMAIL, TEST_ADMIN_EMAIL
- Documenter ces variables dans .env.example
- Chaque test doit être indépendant (pas d'état partagé entre tests)
- Timeout par défaut : 30000ms minimum (selon règles globales)
- Les tests E2E ne remplacent pas les tests unitaires — les deux sont complémentaires
- Ajouter des data-testid uniquement sur les éléments interactifs critiques (pas sur tous les éléments)
</rules>
