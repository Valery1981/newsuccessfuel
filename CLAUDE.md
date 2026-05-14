# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**SuccessFuel ERP** — a multi-tenant SaaS for fuel station management targeting the French-speaking African market. Three account roles: `superadmin`, `gerant` (station manager), `partenaire` (oil company partner). Backend is Supabase (PostgreSQL + RLS + Auth).

**Source de vérité absolue** : `guide/Guide_Document_SuccessFuel.md` — toujours consulter avant d'implémenter la moindre logique métier.

## Commands

```bash
npm run dev          # dev server on port 3000
npm run build        # production build
npm run lint         # ESLint
npm run test         # Vitest unit tests (run once)
npm run test:watch   # Vitest watch mode
npm run test:e2e     # Playwright e2e (auto-starts dev server)

# Run a single test file
npx vitest run src/lib/__tests__/utils.test.ts
```

## Architecture

### Route Groups → Roles

Each role maps to a dedicated route group with its own layout and sidebar:

- `src/app/(auth)/` — login, signup, first-login, callback
- `src/app/(onboarding)/` — multi-step setup wizard (company → station → tanks → pumps → shop → validation)
- `src/app/(manager)/manager/` — gerant dashboard (all operations, reports, structure)
- `src/app/(admin)/admin/` — superadmin (validation, subscriptions, audit logs)
- `src/app/(partner)/partner/` — partenaire (read-only KPIs, grievances, validations)

Auth protection is handled at the page level via `useAuth()` redirects — there is no route-level middleware guard beyond session refresh.

### Supabase Clients — Never Mix

- `src/utils/supabase/client.ts` — browser client (use in Client Components and hooks)
- `src/utils/supabase/server.ts` — async server client with cookies (use in Server Components and Route Handlers)
- `src/utils/supabase/admin.ts` — service-role client (server-only; bypasses RLS — use sparingly)

### State Management

- **Zustand** (`src/stores/`): `authStore` (user, compte, entreprise, role helpers) and `uiStore` (sidebar, locale, theme). Only `entreprise` is persisted in authStore — always refetch `compte` from DB to get the live `must_change_password` value.
- **React Query**: all server data (list queries, mutations). Configured in `src/components/providers.tsx` with 5 min stale time.

### Service Layer

All Supabase queries live in `src/services/`. Components call service functions, not Supabase directly. API routes (`src/app/api/`) are minimal — only for auth callbacks and a first-login endpoint.

### Forms

React Hook Form + Zod. Schemas are colocated with their form components or in `src/lib/`.

### i18n

`next-intl` with locales `fr` (default) and `en`. Routing configured in `src/i18n/routing.ts`. UI is predominantly French.

### Key Business Logic (in `src/lib/utils.ts` and DB functions)

- **CMUP** (weighted-average cost): recalculated on every stock entry via `calculer_cmup()`. The DB function is the source of truth; `src/lib/utils.ts` has a JS mirror for client-side preview.
- **Calibration interpolation**: `interpolateVolume()` / DB `get_volume_from_jauge()` — converts gauge reading (cm) to fuel volume using calibration table.
- **Double-entry accounting**: `ecritures_comptables` + `lignes_ecriture`. DB function `verifier_partie_double()` validates debit = credit. ALWAYS blocking — ∑ debits must equal ∑ credits.
- **Shift lifecycle**: `en_cours → cloture → mouvemente → comptabilise` for both fuel (`shifts_carburant`) and shop (`shifts_boutique`).
- **Account numbers**: NEVER displayed in the UI except in Grand Livre and Balance reports (optional toggle).

### UI Components

shadcn/ui (base-nova style) in `src/components/ui/`. Use `cn()` from `src/lib/utils.ts` for className merging. Notifications use Sonner (`toast` from `sonner`). Charts use Recharts.

### Design System (Dark Mode — SuccessFuel brand)

```css
--or: #f5820a /* Orange — primary actions, CTA */ --blu: #2b7cc1
  /* Blue — accents */ --nav: #1b3d6f /* Navy — sidebar */ --grn: #5bb544
  /* Green — positive indicators */ --bg: #0f1c2e /* Main background */
  --card: #1a2b3e /* Card background */ --red: #f04444 /* Errors, overdue */
  --gold: #f5a623 /* Warnings */;
```

### Testing Conventions

- Unit tests: `src/lib/__tests__/` and colocated `*.test.ts` files. Test business logic and Zod schemas — not UI.
- E2E tests: `e2e/` directory. Use `test.skip` + env var guard when real credentials are required.
- The 28 existing unit tests cover: CMUP, CSV export, currency formatting, double-entry validation, shift CA, stock valuation.

---

## Project Status (dernière analyse : mai 2026)

### ✅ IMPLÉMENTÉ ET FONCTIONNEL

| Domaine        | Composants                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | LoginPage, SignupPage, FirstLoginPage, AuthProvider, hooks, Zustand stores                                                                                                                                     |
| Onboarding     | 6 étapes complètes (company → station → cuves → pistolets → boutique → validation)                                                                                                                             |
| Structure      | 8 pages (Comptes, Tiers, Articles, Carburants, Services, Trésorerie, Camions, Objectifs)                                                                                                                       |
| Initialisation | CompanyInitialisationPage (onglets : cuves, pistolets, stock boutique, immobilisations, tiers, trésorerie, dettes)                                                                                             |
| Traitement     | AchatCarburant (4 onglets), VenteCarburant (shifts), AchatBoutique, ShopSales (POS), StockTransfer, Inventaire, Doléances, ManagerNonSalesOperationsPage                                                       |
| Rapports       | 14 rapports (VentesCarburant, VentesBoutique, CaJournalier, BilanShifts, StockCarburant, StockBoutique, MouvementsStock, GrandLivre, Balance, Trésorerie, CreancesDettes, Consommation, AchatsCarburant, CMUP) |
| Dashboards     | ManagerDashboardPage, PartnerDashboardPage                                                                                                                                                                     |
| Admin          | 7 pages (Dashboard, Stations, Users, Subscriptions, AuditLogs, BugReports, Settings)                                                                                                                           |
| Partner        | 4 pages (Dashboard, Grievances, Stations, Validations)                                                                                                                                                         |
| Tests          | 28 tests unitaires Vitest passants                                                                                                                                                                             |

### ❌ MANQUANT — COMMANDES APEX DISPONIBLES

Chaque fonctionnalité manquante a une commande APEX dans `.claude/commands/` :

| Commande APEX                   | Fonctionnalité                                                                                                                     | Priorité   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `/apex-noperations-panels`      | Sous-panneaux noperations (ChargesCourantes, Créances, Fournisseurs, Gérant, Immobilisations, Salaires, VirementInterne)           | 🔴 HAUTE   |
| `/apex-rapports-commerciaux`    | 7 rapports commerciaux (CA produit, CA pompiste, Comparatif N-1, Réalisations, Top articles, Marge brute, Créances)                | 🔴 HAUTE   |
| `/apex-rapports-financiers`     | 5 rapports financiers (Bilan, Compte résultat, Balance âgée fourn/clients, Situation 460)                                          | 🔴 HAUTE   |
| `/apex-rapports-stocks-avances` | 6 rapports stocks avancés (Historique inventaires, Articles seuil, Faible rotation, Évolution prix, Écarts carburant, Suivi cuves) | 🟠 MOYENNE |
| `/apex-manager-users-sessions`  | Gestion sessions employés + flow first-login complet                                                                               | 🔴 HAUTE   |
| `/apex-permissions-modal`       | UserPermissionsModal — droits granulaires page par page                                                                            | 🔴 HAUTE   |
| `/apex-partner-users`           | Page Users partenaire (Territory Manager + zone géographique)                                                                      | 🟠 MOYENNE |
| `/apex-partner-rapports`        | Rapports partenaire opérationnels (volumes, stocks, objectifs, doléances)                                                          | 🟠 MOYENNE |
| `/apex-notifications-realtime`  | NotificationCenter Supabase Realtime (doléances uniquement)                                                                        | 🟠 MOYENNE |
| `/apex-dashboard-enhancements`  | Compléter dashboards gérant + partenaire selon specs exactes Guide                                                                 | 🟠 MOYENNE |
| `/apex-export-pdf`              | Export PDF (CSS print pour rapports + @react-pdf pour documents officiels)                                                         | 🟡 BASSE   |
| `/apex-admin-complet`           | Admin Dashboard KPIs globaux, RevenuePage, ExpensesPage, AuditLogs filtres+CSV                                                     | 🟡 BASSE   |
| `/apex-e2e-tests`               | Suite complète tests Playwright (auth, onboarding, shifts, POS, rapports)                                                          | 🟡 BASSE   |
| `/apex-deploiement-vercel`      | vercel.json, variables env, déploiement production                                                                                 | 🟡 BASSE   |

### Utilisation des commandes APEX

Pour implémenter une fonctionnalité, lancer la commande correspondante :

```
/apex-noperations-panels
/apex-rapports-commerciaux
# etc.
```

Chaque commande contient :

1. **Analyze** — fichiers à lire avant de coder
2. **Plan** — liste exhaustive des fichiers à créer/modifier
3. **Execute** — étapes d'implémentation dans l'ordre
4. **Validate** — checklist de validation

---

## Règles Métier Critiques (NE JAMAIS DÉVIER)

1. **Numéros de comptes** : INVISIBLES en frontend partout sauf Grand Livre et Balance (option)
2. **Partie double** : BLOQUANTE — ∑ Débits = ∑ Crédits, sinon BLOQUÉ
3. **CMUP** : seule méthode de valorisation, calculé via `calculer_cmup()` (trigger SQL)
4. **Jauge → Volume** : TOUJOURS via `interpolateVolume()` / `get_volume_from_jauge()` (interpolation calibrages)
5. **Shifts carburant** : PAS d'ouverture manuelle — clôture auto ouvre le suivant
6. **Index pistolet** : initial = final shift précédent, NON modifiable
7. **Clôture shift carburant** : par supérieur hiérarchique (autre session)
8. **POS boutique** : même session ouvre ET clôture
9. **Partenaire** : JAMAIS de données financières (CA carburant, marges, trésorerie, comptabilité)
10. **Mouvementer avant Comptabiliser** : bouton Comptabiliser grisé sans mouventation préalable
11. **Prix carburant historisé** : changement = nouvel enregistrement daté, passé conservé
12. **Sessions employés** : droits granulaires par page/fonctionnalité, JAMAIS par rôle hiérarchique
13. **Performance** : chargement pages et requêtes ≤ 1 seconde
14. **Supabase Realtime** : UNIQUEMENT pour doléances — ne pas surcharger

## Sécurité RLS — Règles Critiques

- RLS strict sur toutes les tables sensibles
- Chaque gérant ne voit que les données de ses entreprises/stations
- Le partenaire voit uniquement les données opérationnelles des stations de son réseau (jamais financières)
- Les sessions employés héritent des droits du compte parent + restrictions supplémentaires
- Pas de queries directes à `auth.users` côté client — passer par la table `comptes`
- `SUPABASE_SERVICE_ROLE_KEY` : serveur uniquement, jamais exposée côté client

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
