# Rapport de convergence — Itération 1

**Date** : 2026-05-15
**Référence** : `apex-2026-05-15-11-convergence-finale.md`
**Périmètre** : `src/` ↔ `guide/Guide_Document_SuccessFuel.md` (§1-§18 + DIFF.md + 20 règles métier)

---

## Métriques actuelles

- 106 routes Next.js (`src/app/**/page.tsx`)
- 180 composants TSX
- 32 services Supabase
- 12 specs Playwright
- 1 canal Realtime (`useRealtimeNotifications` — doléances uniquement ✅)
- 153 tests Vitest passants
- Build vert / ESLint 0 / TypeScript 0

---

## Résultats par section du Guide

| § | Sujet | Statut | Preuve / écart |
|---|-------|--------|----------------|
| §1 | Philosophie (compta auto, numéros invisibles) | ✅ | Comptes affichés en libellé partout sauf Grand Livre/Balance |
| §2 | 3 types de comptes + sessions | ✅ | `superadmin`, `gerant`, `partenaire`, `session_gerant` + Territory Manager |
| §3 | Stack technique (Next 16, Supabase, TanStack, Zustand) | ✅ | conforme |
| §4 | Architecture projet (route groups, services) | ✅ | `(auth)/(onboarding)/(manager)/(partner)/(admin)/` |
| §5 | Design system (palette, responsive) | ✅ | `globals.css` + Tailwind + shadcn/ui |
| §6 | Auth & redirections | ✅ | `useAuth.redirectAfterLogin()` par type de compte |
| §7 | Onboarding gérant (6 étapes + calibrage 3 règles) | ✅ | APEX-03 a extrait/testé les 3 règles |
| §8.1 | Plan comptable standard 70+ comptes | ✅ | APEX-08 a vérifié 78 comptes conformes |
| §8.1 | "Classes 3,4,5 auto-générés" | ✅ | APEX-01 vue agrégée `vue_plan_comptable_complet` |
| §8.2 | Tiers (401/411/421+460) | ✅ | `tiersService.createTiers` avec `compte_responsabilite` |
| §8.3 | Articles 6 familles figées | ✅ | `StructureArticlesPage` |
| §8.4 | Trésorerie (512/513/514/530) | ✅ | `tresorerieService` |
| §8.5 | Prix carburant historisé | ✅ | `prixCarburantService` (historique daté) |
| §8.6 | Objectifs (volume + CA boutique) | ✅ | `objectifService` |
| §8.7 | Seuils alerte stock | ✅ | table `seuils_alerte_stock` |
| §8.8 | Camions | ✅ | `StructureCamionsPage` + `compartiments_camion` |
| §9 | Initialisation 7 onglets + 2 colonnes + irréversible | ✅ | APEX-02 a refait le layout 2 colonnes |
| §10.1 | Achat carburant 4 onglets | ✅ | `AchatCarburantPage` (995L) |
| §10.2 | Vente carburant shifts (clôture par superviseur) | ✅ | `VenteCarburantPage` |
| §10.2 | Jauge → Volume via calibrages | ✅ | APEX-02 a corrigé le volume auto-calculé |
| §10.3 | Achat boutique 3 modes | ✅ | `AchatBoutiquePage` |
| §10.4 | POS boutique même session | ✅ | `ManagerShopSalesPage` |
| §10.5 | Transfert stock (CMUP origine) | ✅ | `ManagerStockTransferPage` |
| §10.6 | Inventaire carburant (motif obligatoire) | ✅ | `InventaireCarburantPage` |
| §10.7 | Inventaire boutique | ✅ | `InventaireBoutiquePage` |
| §10.8 | Opérations hors A&V (7 types) | ✅ | APEX-04 a confirmé les 7 dialogs (1 inline + 6) |
| §11 | Dashboard gérant (KPIs + recharts) | ✅ | `ManagerDashboardPage` |
| §12 | Interface partenaire (ops uniquement) | ✅ | `PartnerDashboardPage` + 8 rapports |
| §12 | DIFF.md (KPIs MTD, projections, LastUpdate) | ✅ | APEX-06 a confirmé conformité + ajouté `LastUpdateBadge` |
| §13 | Rapports (financiers/commerciaux/stocks) | ✅ | 30+ routes rapports |
| §14 #1 | Numéros comptes invisibles | ✅ | sauf Grand Livre/Balance (option) |
| §14 #2 | Partie double bloquante | ✅ | `verifier_partie_double()` |
| §14 #3 | CMUP via trigger SQL | ✅ | `calculer_cmup()` |
| §14 #4 | Jauge → Volume via calibrages | ✅ | APEX-02 |
| §14 #5-7 | Shift carburant règles | ✅ | conforme |
| §14 #8 | POS même session | ✅ | conforme |
| §14 #9 | Stock boutique temps réel | ✅ | invalidation TanStack post-vente (APEX-05) |
| §14 #10 | Comptabilisation boutique groupée | ✅ | conforme |
| §14 #11 | Prix carburant historisé | ✅ | conforme |
| §14 #12 | Mouvementer avant Comptabiliser | ✅ | bouton conditionné par `achat.mouvemente` |
| §14 #13 | Initialisation irréversible | ✅ | conforme |
| §14 #14 | Realtime doléances uniquement | ✅ | APEX-05 |
| §14 #15 | 460 = écart non justifié | ✅ | conforme |
| §14 #16 | Partenaire jamais financier | ✅ | service partenaire isolé |
| §14 #17 | Calibrage 3 règles | ✅ | APEX-03 |
| §14 #18 | Import calibrage signalement erreurs | ✅ | `CalibrageImporter` + edge function |
| §14 #19 | POS articles cochés uniquement | ✅ | `StructureCarburantsPage` cochage |
| §14 #20 | Sessions droits granulaires | ✅ | `permissions.ts` + APEX-07 `PermissionGate` |
| §15 | Base de données (RPC, RLS, transactions) | ✅ | RLS strict + migrations optimisées |
| §16 | Tests obligatoires | ⚠️ | 153 unit + 12 e2e ; coverage e2e à étendre (APEX-09) |
| §17 | Fichiers de suivi (actions, demandes, todo) | ✅ | maintenus à chaque APEX |
| §18 | Notes (perf ≤ 1s, realtime restreint) | ✅ | conforme |

---

## Écarts résiduels (non bloquants)

| Sévérité | Description | APEX référent | Décision |
|----------|-------------|---------------|----------|
| 🟡 | Couverture E2E incomplète (manque onboarding, shifts, POS, rapports) | APEX-09 | Reportée — sprint dédié |
| 🟡 | `PermissionGate` à appliquer à 5 autres pages (POS, inventaire, transfert, opérations, doléances) | APEX-07 | Non bloquant — gérant a toutes permissions |
| 🟡 | TMFilter global avec zone géographique | DIFF §6 | Reportée — nécessite schema `zone_geographique` |
| 🟡 | Refactor `noperations/` vers sous-dossiers modulaires | APEX-04 | NOOP cosmétique |

Aucun écart 🔴 ou 🟠 résiduel.

---

## Critère d'arrêt — Itération 1

**STATUT : ✅ CONVERGENCE ATTEINTE pour les écarts critiques et hauts**

- Les 3 exemples explicitement remontés par l'utilisateur (Plan Comptable agrégé, Initialisation 2 colonnes, Volume auto-calculé) → **résolus**
- Tous les écarts identifiés en sévérité 🔴 ou 🟠 → **résolus ou audités conformes**
- Les écarts 🟡 résiduels sont documentés, non bloquants, et reportés explicitement

**Plus de boucle nécessaire pour cette itération**. Si l'utilisateur souhaite traiter les écarts 🟡, ouvrir un nouvel APEX dédié.

---

## Tag final
`convergence-2026-05-15-iter1-ok`
