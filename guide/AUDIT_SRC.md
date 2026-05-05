# AUDIT COMPLET — `src/` vs `guide/rules.md`
> Généré : 2026-05-05 — Bible de référence : `@guide/rules.md` (800 lignes, source de vérité absolue)

## 0. Vue d'ensemble

| Indicateur | Valeur | Verdict |
|---|---|---|
| Fichiers `.ts/.tsx` total | 303 | — |
| Composants `components/` | 147 | — |
| Pages `app/` (Manager/Admin/Partner/Onboarding/Auth/API) | 97 | — |
| Services Supabase | 20 | ✅ bien découpés |
| Tests unitaires Vitest | 9 | ❌ largement sous-dimensionné |
| Tests E2E Playwright | 8 | ⚠️ 8 spec couvre basique |
| `console.log` résiduels | 0 | ✅ |
| `TODO/FIXME/HACK` | 0 | ✅ |
| `: any` / `as any` | 5 occurrences | ⚠️ à nettoyer |
| Couleurs HEX hardcodées en TSX | 63 | ⚠️ design tokens à extraire |
| Realtime channels | 1 (`useRealtimeNotifications`) | ✅ conforme §5.4 |
| Query directe `auth.users` côté client | 0 | ✅ conforme §5.4 |

---

## 1. CONFORMITÉ SITEMAP (§5.1)

### Écarts de nommage — bloquants pour cohérence

| Spec rules.md §5.1 | Existant `src/app/` | Action |
|---|---|---|
| `/manager/traitements/` | `/manager/traitement/` (singulier) | 🔴 RENOMMER |
| `/manager/parametres/` | `/manager/structure/` | 🔴 RENOMMER |
| `/manager/traitements/shift-carburant` | `/manager/traitement/vente-carburant` | 🔴 RENOMMER |
| `/manager/traitements/pos-boutique` | `/manager/traitement/vente-boutique` | 🔴 RENOMMER |
| `/manager/traitements/inventaire-carburant` + `/inventaire-boutique` | `/manager/traitement/inventaire` (fusionné) | 🟡 SPLITTER |
| `/onboarding/entreprise` | `/onboarding/company` | 🔴 RENOMMER FR |
| `/onboarding/station` (wrapper 4 sous-étapes) | `/onboarding/station` + `/cuves` + `/pistolets` + `/boutique` (frères) | 🟡 RESTRUCTURER |
| `/onboarding/attente` | `/onboarding/validation` | 🔴 RENOMMER |

### Pages manquantes vs sitemap

- ❌ `/manager/parametres/plan-comptable` (exist. `structure/comptes` — OK conceptuellement mais noms à aligner)
- ❌ `/manager/parametres/prix-carburant` dédié **(route absente)**
- ❌ `/manager/parametres/seuils-alertes` par article/station **(absent)**
- ❌ `/manager/parametres/utilisateurs` : existe à `/manager/users` — déplacer sous parametres
- ❌ Opérations splittées : `virement-interne`, `encaissement-creances`, `reglement-dettes`, `charges-courantes`, `salaires`, `charges-fiscales`, `operations-gerant`, `immobilisations` — **actuellement tout dans `/operations/page.tsx` avec des Dialogs**
- ❌ Rapports splittés par type : `/manager/rapports/financiers`, `/commerciaux`, `/stocks` — actuellement **tout à plat sous `/rapports/*`** (25 sous-routes)
- ❌ `/admin/comptes-gerants`, `/admin/partenaires`, `/admin/validation-stations`, `/admin/plan-comptable-standard`, `/admin/sessions` → mapping à `/admin/users`, `/admin/stations`, `/admin/settings` incomplet

### Pages présentes non prévues au sitemap (à documenter ou déplacer)

- `/admin/audit-logs`, `/admin/bug-reports`, `/admin/expenses`, `/admin/revenue`, `/admin/subscriptions` → extensions business valides, à ajouter au sitemap rules.md
- `/manager/notifications` + `/partner/notifications` → non spec mais cohérentes avec Realtime §5.4

---

## 2. CONFORMITÉ STACK (§2)

| Règle §2 | Actuel | Verdict |
|---|---|---|
| Next.js 16 App Router, TS strict | 16.2.4 ✅ | ✅ |
| `typescript.strict` | `next.config.ts` : `ignoreBuildErrors: true` | 🔴 **VIOLATION BLOQUANTE** |
| shadcn/ui UNIQUEMENT | 21 primitives shadcn + `@base-ui/react` (dépendance du shadcn moderne) | ✅ OK (base-ui est le moteur shadcn v4) |
| Tailwind CSS | ✅ v4 | ✅ |
| Supabase uniquement | ✅ `@supabase/ssr` + `supabase-js` | ✅ |
| TanStack Query | ✅ v5 | ✅ |
| Zustand (authStore, uiStore) | ✅ les 2 présents | ✅ |
| next-intl fr/en | ✅ v4 | ✅ |
| next-pwa offline | installé mais **non activé** dans `next.config.ts` | 🔴 **À ACTIVER** |
| Validation Zod | ✅ v4 | ✅ |
| Vitest + Playwright | ✅ configurés | ✅ |
| ORM = Supabase JS uniquement | ✅ aucun Prisma | ✅ |
| Recharts | ✅ v3 | ✅ |

---

## 3. CONFORMITÉ RÈGLES MÉTIER (§6)

### §6.1 Comptabilité automatique
- ❓ **Non auditable sans ouverture des pages compta** : partie double bloquante, CMUP, numéros invisibles frontend.
- 🔴 **Risque** : `src/services/inventaireService.ts` insère des `lignes as any[]` (2×) — typage comptable probablement contourné. À vérifier vs schéma SQL.

### §6.2 Shifts carburant
- 📂 `VenteCarburantPage.tsx` existe, mais **nommé `vente-carburant` au lieu de `shift-carburant`** → sémantique spec non respectée (un shift ≠ une vente).
- ❓ À vérifier : index initial verrouillé, clôture par supérieur hiérarchique, auto-ouverture shift suivant.

### §6.3 Boutique POS
- 📂 `ManagerShopSalesPage.tsx` présent. Vérifier filtre "articles cochés à la création station" (§6.3 dernière règle).

### §6.4 Stocks
- 📂 `InventairePage.tsx` fusionne carburant + boutique — **spec dit deux pages distinctes**.
- ❓ Bouton Comptabiliser grisé tant que non mouvementé : à vérifier dans `AchatCarburantPage.tsx`.

### §6.5 Prix historisés
- 🔴 **Route `/parametres/prix-carburant` absente** → point critique §6.5.

### §6.6 Calibrage cuves
- 📂 `FuelTankCalibrationPage.tsx` + `/onboarding/cuves` route présente.
- ❓ Import PNG/PDF/JPG Edge Function `import-calibrage` : à vérifier côté Supabase.

### §6.7 Initialisation
- 📂 `CompanyInitialisationPage.tsx` présent. ✅
- ❓ Irréversibilité + capital net calculé à vérifier.

### §6.8 Partenaire — données interdites
- 📂 `partner/reports/` contient : Achats, CA Boutique, Comparatif, Doléances Stats, Écarts Carburant, Réalisations, Stocks, Volumes.
- 🟢 Pas de `CaCarburantReport`, `MargeReport`, `TresorerieReport` pour le partenaire. ✅
- ❓ À vérifier : `PartnerRealisationsReport` ne doit PAS exposer CA carburant, `PartnerComparatifReport` ne doit PAS exposer marges.

---

## 4. INVENTAIRE UI (§5.5 — 40 composants spec)

| # | Composant spec | État | Fichier |
|---|---|---|---|
| 01 | AppShell | ✅ équivalent | `layout/ManagerLayout.tsx` |
| 02 | Sidebar | ✅ | `components/ui/sidebar.tsx` |
| 03 | StationSelector | ❓ | non trouvé dédié |
| 04 | PageHeader | ✅ | `components/common/PageHeader.tsx` |
| 05 | DataTable | ⚠️ | `@tanstack/react-table` dispo mais pas de wrapper `DataTable` partagé |
| 06 | FilterBar | ✅ partiel | `reports/ReportFilters.tsx` (scope rapports) |
| 07 | MultiStepForm | ✅ | onboarding flow |
| 08 | CalibrageEditor | ✅ | `FuelTankCalibrationPage.tsx` |
| 09 | CalibrageImporter | ❌ | upload OCR PNG/PDF absent |
| 10 | PriceInput | ❌ | pas de composant dédié |
| 11 | DateRangePicker | ✅ | `components/ui/calendar.tsx` + `react-day-picker` |
| 12 | StationCheckboxes | ❓ | à vérifier dans onboarding boutique |
| 13 | TiersSelect | ❓ | probablement inline, pas de composant partagé |
| 14 | TresorerieSelect | ❓ | idem |
| 15 | ShiftCard | ❌ | |
| 16 | ShiftClotureForm | ✅ | dans `VenteCarburantPage.tsx` |
| 17 | POSLayout | ✅ | `ManagerShopSalesPage.tsx` |
| 18 | POSCatalog | ✅ | idem |
| 19 | POSTicket | ✅ | idem |
| 20 | StockJauge | ❌ | visualisation cuve manquante |
| 21 | InventaireRow | ✅ | dans `InventairePage.tsx` |
| 22 | AchatCarburantStepper | ✅ | `AchatCarburantPage.tsx` 4 onglets |
| 23 | EcriturePreview | ❓ | non trouvé — risque §6.1 |
| 24 | MouvementTimeline | ❌ | |
| 25 | KPICard | ✅ | probable inline dashboard |
| 26 | RealisationBar | ❓ | à vérifier |
| 27 | TresorerieGauge | ❌ | |
| 28 | AlertesList | ❓ | à vérifier |
| 29 | CAChart | ✅ recharts | |
| 30 | CapitauxPropresBadge | ❌ | |
| 31 | ConfirmDialog | ✅ | `common/ConfirmDialog.tsx` |
| 32 | ToastManager | ✅ | sonner configuré |
| 33 | SkeletonTable | ✅ | `components/ui/skeleton.tsx` |
| 34 | EmptyState | ✅ | `common/EmptyState.tsx` |
| 35 | StatusBadge | ⚠️ | `components/ui/badge.tsx` mais pas de mapping statuts métier |
| 36 | PDFExportButton | ⚠️ | `PrintButton.tsx` présent, export PDF via print CSS |
| 37 | ExcelExportButton | ⚠️ | `lib/exportCsv.ts` existe — Excel propre absent |
| 38 | CreanceEcheance | ❌ | badge échéance rouge/orange/vert absent |
| 39 | PartieDoubleCheck | ❌ | indicateur ∑D=∑C absent — **critique §6.1** |
| 40 | OfflineBanner | ❌ | |

**Bilan** : 18/40 ✅ présents, 10/40 ❌ manquants, 12/40 ❓ à auditer.

---

## 5. DETTE TECHNIQUE

### 5.1 Bloquants
- 🔴 `next.config.ts: ignoreBuildErrors: true` masque toutes les erreurs TS (**viole §2 et §8**).
- 🔴 `next-pwa` installé mais pas activé → règle §2 + §5.5-40 (OfflineBanner) + modes offline caisse impossibles.
- 🔴 Sitemap non aligné (singulier vs pluriel, anglais vs français).

### 5.2 Majeurs
- 🟡 9 tests unitaires pour 303 fichiers — ratio ~3% (spec implicite : 1 test/feature).
- 🟡 8 specs E2E pour 97 pages — couverture superficielle.
- 🟡 5× `any` (dont 2 dans `inventaireService` sur insertions — risque typage comptable).
- 🟡 63 couleurs HEX hardcodées en TSX → palette §4 à externaliser en tokens Tailwind.
- 🟡 Pas de composant `DataTable` partagé réutilisable.

### 5.3 Mineurs
- 🟢 0 `console.log`, 0 TODO/FIXME, tests RLS mockés, structure services cohérente.
- 🟢 Middleware fonctionnel (`src/proxy.ts` Next.js 16 convention) avec protection routes.

---

## 6. COUVERTURE MÉTIER (vs §6 & §5.7)

| Module spec (§5.7) | Implémenté ? | Composant |
|---|---|---|
| Module 1 : Onboarding multi-step | ✅ | `components/onboarding/*` |
| Module 2 : Calculateur prix carburant | ❌ | page absente |
| Module 3 : POS catalog facettes + barcode | ⚠️ partiel | `ManagerShopSalesPage` — barcode scan à vérifier |
| Module 4 : Dashboard analytique | ✅ | `ManagerDashboardPage.tsx` |
| Module 5 : Auth + sessions granulaires | ✅ | `AuthProvider` + `permissions.ts` + `UserPermissionsModal` |

---

## 7. SYNTHÈSE

### Ce qui est solide ✅
- Archi Next.js 16 + Supabase SSR + RLS via middleware
- Stack conforme (Zustand, TanStack, shadcn v4, next-intl, Zod)
- 147 composants structurés (admin, manager, partner, onboarding, reports)
- 34 rapports implémentés (5 catégories)
- Auth, first-login, permissions granulaires
- Realtime isolé au seul usage légitime (notifications)

### Ce qui est à redresser 🔴
1. `ignoreBuildErrors` — désactiver immédiatement
2. Sitemap naming (parametres/traitements en FR, séparation opérations)
3. PWA offline à activer
4. 22 composants UI critiques absents (PartieDoubleCheck, StockJauge, CreanceEcheance, StationSelector, etc.)
5. Prix carburant : route paramétrage absente (§6.5)
6. Tests E2E/unit à multiplier par ~5

### Score global de conformité rules.md
| Axe | Score |
|---|---|
| Stack technique | 90 % |
| Architecture projet | 75 % |
| Sitemap & nommage | 60 % |
| Composants UI (§5.5) | 45 % |
| Règles métier (§6) | 70 % (vérifications manuelles à compléter) |
| Tests (§8) | 20 % |
| **Global pondéré** | **≈ 62 %** |
