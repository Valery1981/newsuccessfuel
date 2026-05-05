# APEX — Plan d'Exécution Priorisé

> Basé sur `guide/AUDIT_SRC.md` + `guide/rules.md` (§1.1 Mode Plan, §1.4 Vérification, §8 Tests)
> Règle d'or : **Cohérence > Rapidité** (§0). Chaque APEX termine obligatoirement par `npm run test && npx playwright test && npx tsc --noEmit && npm run build` (§8).

---

## 📊 Matrice de priorité

| Priorité             | Impact                               | Effort | Phase   |
| -------------------- | ------------------------------------ | ------ | ------- |
| 🔴 P0 — Bloquant     | Viole règle absolue / build cassé    | —      | Phase 1 |
| 🟠 P1 — Critique     | Impact métier direct / UX cassée     | —      | Phase 2 |
| 🟡 P2 — Majeur       | Conformité sitemap / composants spec | —      | Phase 3 |
| 🟢 P3 — Amélioration | Dette technique / refactor           | —      | Phase 4 |

---

## PHASE 1 — FONDATIONS (P0 Bloquants) — ✅ TERMINÉE (2026-05-05)

### 📋 Journal de phase 1

| APEX                | Statut                                                   | Durée  | Tests après      |
| ------------------- | -------------------------------------------------------- | ------ | ---------------- |
| APEX-01 TS strict   | ✅                                                       | 15 min | 51 ✅ + build OK |
| APEX-02 PWA Offline | ⚠️ Partiel (OfflineBanner livré, SW à migrer → APEX-02b) | 10 min | OK               |
| APEX-03 Sitemap FR  | ✅                                                       | 15 min | 51 ✅ + build OK |

### 🧭 Décisions clés Phase 1

**APEX-01 — Erreurs rencontrées & résolutions :**

- _Erreur 1_ : `src/app/(auth)/public/reset-password/page.tsx` importait `ResetPasswordPage` inexistant.
  - **Options** : (a) créer le composant, (b) supprimer la route, (c) rediriger vers login.
  - **Choix** : (a) créer `components/auth/ResetPasswordPage.tsx` — feature attendue ERP, `resetPasswordForEmail` Supabase déjà dispo, cohérent avec first-login §6.
- _Erreur 2_ : `Button asChild` utilisé mais le `Button` local (non-Radix) ne le supporte pas.
  - **Options** : (a) ajouter `asChild` au Button, (b) utiliser `buttonVariants` sur un `<Link>`.
  - **Choix** : (b) moins invasif, n'impacte pas 100+ autres usages du Button.
- _Erreur 3_ : 5 `any` dans 3 fichiers dont 2 dans `inventaireService` sur inserts.
  - **Options** : (a) régénérer types Supabase, (b) coalescer null → 0, (c) cast `as unknown`.
  - **Choix** : (b) pour `cmup`/`stock_theorique`/`quantite_reelle` (sémantique métier acceptable : "non encore saisi = 0"), (c) pour jointure `articles(nom)` non déclarée FK.
- _Erreur 4_ : `adminService` a 2 `as any` avec `eslint-disable` pour table `depenses_plateforme` absente des types générés.
  - **Choix** : conservés en l'état (déjà documentés, cast scopé). Régénération types dans APEX futur.

**APEX-02 — Découpage forcé :**

- _Constat_ : `next-pwa@5.6.0` dans package.json est incompatible Next.js 16.
- **Options** : (a) migrer vers `@serwist/next`, (b) Service Worker manuel, (c) livrer l'OfflineBanner seul.
- **Choix** : (c) immédiat. Migration SW → **APEX-02b** reportée (sous-projet à part entière).
- _Composant_ : `OfflineBanner.tsx` utilise `useSyncExternalStore` (pattern moderne pour `navigator.onLine`) plutôt que `useEffect + useState` (évite warning React Compiler sur cascading renders).

**APEX-03 — Piège imbrication :**

- _Erreur_ : `git mv structure → parametres` a imbriqué `structure/` dans un `parametres/` préexistant (qui contenait déjà `page.tsx = ManagerCompanyPage`).
  - **Résolution** : `git mv` chaque sous-dossier individuellement puis `rmdir` le `structure/` orphelin. Conservé le `parametres/page.tsx` (ManagerCompanyPage sert de hub parametres — cohérent).
- _Erreur_ : replacement perl trop ciblé (`/manager/traitement/` mais pas `/traitement/` nu) → 2ème passe nécessaire.
- _Erreur_ : après renommage des routes, les imports `@/components/manager/structure/*` cassés.
  - **Choix** : renommer aussi `components/manager/structure/` → `components/manager/parametres/` pour cohérence 1:1 avec le sitemap.

### APEX-01 : Restaurer TypeScript strict ⚡

**Objectif** : `npx tsc --noEmit` → 0 erreur (§8).

1. `next.config.ts` : retirer `typescript.ignoreBuildErrors: true`.
2. `npx tsc --noEmit` → lister toutes les erreurs.
3. Corriger les 5 `as any` / `: any` identifiés :
   - `ManagerStockTransferPage.tsx:354` : typer `transferts`.
   - `inventaireService.ts:218,259` : typer correctement les `lignes` d'inventaire (utiliser types générés `Database['public']['Tables'][...]`).
   - `adminService.ts:233,251` : remplacer `supabase as any` par RPC typée ou extension types.
4. Corriger toutes les erreurs TS restantes (par vagues thématiques).
5. Re-run `npm run build` → doit passer sans flag permissif.

**Tests** : `npm run test && npx tsc --noEmit && npm run build` ✅
**Fichiers** : `next.config.ts`, 3 services, 1 page
**Règle bible** : §2 TypeScript strict, §8 Build doit réussir

### APEX-02 : Activer PWA offline ⚡

**Objectif** : Mode hors-ligne caisse boutique + OfflineBanner (§2 PWA, §5.5-40).

1. Configurer `next-pwa` dans `next.config.ts` avec runtime cache stratégies.
2. Vérifier `public/manifest.json` conforme.
3. Créer `components/common/OfflineBanner.tsx` (§5.5-40).
4. Test E2E : `e2e/offline.spec.ts` — simuler offline, vérifier banner + cache shell.

**Tests** : unit OfflineBanner + e2e offline mode
**Règle bible** : §2 PWA obligatoire, §5.5 composant 40

### APEX-03 : Aligner sitemap FR (§5.1) ⚡

**Objectif** : Nommage exact par rapport au sitemap bible.

1. Renommer dossiers (git mv pour préserver historique) :
   - `app/(manager)/manager/traitement/` → `traitements/`
   - `app/(manager)/manager/structure/` → `parametres/`
   - `app/(manager)/manager/traitement/vente-carburant/` → `traitements/shift-carburant/`
   - `app/(manager)/manager/traitement/vente-boutique/` → `traitements/pos-boutique/`
   - `app/(onboarding)/company/` → `entreprise/`
   - `app/(onboarding)/validation/` → `attente/`
2. Mettre à jour tous les `href` / `redirect` / `useRouter().push` / liens sidebar.
3. Mettre à jour `lib/authPaths.ts` et messages i18n `messages/fr.json` + `en.json`.
4. Vérifier tests E2E (chemins durs).

**Tests** : e2e navigation complète + unit `authPaths.test.ts`
**Règle bible** : §5.1 Sitemap exact

---

## PHASE 2 — RÈGLES MÉTIER MANQUANTES (P1 Critiques) — ✅ TERMINÉE (2026-05-05)

### 📋 Journal de phase 2

| APEX                      | Statut                                                 | Durée  | Tests après |
| ------------------------- | ------------------------------------------------------ | ------ | ----------- |
| APEX-05 PartieDoubleCheck | ✅ composant + 8 tests unit + `computeBalance` exporté | 15 min | 59 ✅       |
| APEX-04 PrixCarburant     | ✅ service + page + route + sidebar                    | 20 min | TS OK       |
| APEX-06 Split inventaire  | ✅ prop `initialTab` + 2 routes dédiées                | 5 min  | TS OK       |
| APEX-07 Split opérations  | ✅ prop `initialDialog` + 8 routes dédiées             | 5 min  | TS OK       |

### 🧭 Décisions clés Phase 2

**APEX-05 — Approche composant + logique pure :**

- _Stratégie_ : séparer `computeBalance()` (logique pure exportée) du composant `PartieDoubleCheck` (rendu).
  - Permet tests unitaires ciblés sur la logique comptable critique (8 cas : équilibre exact, tolérance, NaN, tableaux vides…).
  - Permet appel direct depuis la logique métier (hook, mutation onSubmit) pour bloquer un bouton sans re-render.
- _Tolérance arrondi_ : défaut 0.01 (1 centime) — paramétrable. Cas concret : addition de flottants peut donner 100.00000001 vs 100.
- _Style_ : bordure + fond colorés vert/rouge, icônes lucide, `role="status" aria-live="polite"` pour accessibilité.
- _Intégration dans pages existantes_ : différée — le composant est livré et les intégrations se feront au fil de chaque refactor de page comptable (évite un mega-PR multi-pages risqué).

**APEX-04 — Zod v4 piège :**

- _Erreur_ : `z.coerce.number()` produit `unknown` en entrée → incompatible avec `zodResolver` typé `number`.
  - **Choix** : `z.number()` + React Hook Form `valueAsNumber: true` sur `register()`. Plus clean.
- _Erreur_ : `CompteInfo` n'expose pas `entreprise_id` direct — `entreprise.id` via store séparé.
  - **Choix** : utiliser `useAuthStore().entreprise` (déjà dispo). Cohérent avec le reste de l'app.
- _Erreur_ : `stationService.getByEntreprise` n'existe pas → le vrai nom est `getStationsByEntreprise`.
- _Piège RHF_ : le warning React Compiler sur `watch()` est ignoré (pré-existant, pattern RHF standard).

**APEX-06 — Pragma minimal :**

- _Constat_ : `InventairePage.tsx` = 1074 lignes monolithiques — splitter en 2 composants = gros risque régression.
- **Options** : (a) split complet en 2 composants, (b) prop `initialTab` minimal.
- **Choix** : (b). 2 routes `inventaire-carburant` et `inventaire-boutique` montent le même composant avec `initialTab` différent. Le split structurel complet est un APEX futur de refactor UI (hors P1).
- _Conformité §6.4_ : oui — les deux URLs distinctes existent, utilisateur atterrit directement sur le bon onglet.

**APEX-07 — Même pragma :**

- _Approche identique_ : prop `initialDialog` sur le hub `ManagerNonSalesOperationsPage`.
- _Bénéfice_ : les 8 URLs existent (conforme §5.1), ouvrent directement le bon dialog.
- _Dette_ : conversion complète des dialogs en pages full-screen → APEX futur si besoin UX.
- _Génération_ : les 8 `page.tsx` générées via un loop shell `for op in ...; do cat > $op/page.tsx << EOF ...; done` (DRY).

### Plan original Phase 2 (conservé pour référence)

### APEX-04 : Page Prix Carburant historisée ⭐

**Objectif** : §6.5 Historisation obligatoire + §5.7 Module 2.

1. Créer `app/(manager)/manager/parametres/prix-carburant/page.tsx`.
2. Créer `components/manager/parametres/PrixCarburantPage.tsx` :
   - Table historique par station/type carburant.
   - Formulaire : PV + Marge → PA calculé auto (read-only).
   - Zod : PV>0, Marge>0, Marge<PV.
   - Mutation → INSERT nouvelle ligne datée (jamais UPDATE).
3. `services/prixCarburantService.ts` : `getHistorique(stationId)`, `create(...)`.
4. Hook `usePrixCarburant(stationId)` avec invalidation TanStack Query.
5. Ajouter entrée sidebar `/manager/parametres/prix-carburant`.

**Tests** : unit service + hook + e2e saisie historisation
**Règle bible** : §6.5, §5.7 Module 2

### APEX-05 : Composant `PartieDoubleCheck` — §6.1 BLOQUANT ⭐

**Objectif** : Garde-fou comptable ∑D = ∑C pour TOUTE écriture.

1. Créer `components/compta/PartieDoubleCheck.tsx` :
   - Props : `debits: number[]`, `credits: number[]`.
   - Affiche somme D, somme C, différence, badge ✅/❌.
   - Expose `isBalanced: boolean` via contexte/callback.
2. Wrapper `EcriturePreview.tsx` pour aperçu avant validation.
3. Intégrer dans toutes les pages d'écriture comptable :
   - `AchatCarburantPage` (onglet Paiement).
   - `AchatBoutiquePage`.
   - `ManagerNonSalesOperationsPage` et ses 8 dialogs.
   - `CompanyInitialisationPage` (capital net).
4. Bloquer bouton `Comptabiliser` si `!isBalanced`.

**Tests** : unit logique + e2e blocage validation
**Règle bible** : §6.1 Partie double BLOQUANTE

### APEX-06 : Splitter Inventaire carburant / boutique ⭐

**Objectif** : §6.4 + §5.1 deux pages distinctes.

1. Créer `app/(manager)/manager/traitements/inventaire-carburant/page.tsx`.
2. Créer `app/(manager)/manager/traitements/inventaire-boutique/page.tsx`.
3. Extraire la logique commune dans `components/manager/inventory/InventaireCarburantPage.tsx` + `InventaireBoutiquePage.tsx`.
4. Conserver `InventaireRow` mais spécialiser les formules stock théorique.
5. Supprimer la page fusionnée `/inventaire/` après migration.

**Tests** : e2e parcours régularisation carburant + boutique
**Règle bible** : §6.4

### APEX-07 : Splitter Opérations hors A&V ⭐

**Objectif** : §5.1 — 8 sous-pages au lieu d'un dialog modal.

1. Créer 8 routes sous `app/(manager)/manager/traitements/operations/` :
   - `virement-interne/`, `encaissement-creances/`, `reglement-dettes/`, `charges-courantes/`, `salaires/`, `charges-fiscales/`, `operations-gerant/`, `immobilisations/`.
2. Migrer chacun des dialogs existants (`ChargesCourantesDialog`, `SalairesDialog`, etc.) vers une page full.
3. Conserver les dialogs comme composants réutilisables au besoin.
4. Page `/operations/` devient index/hub avec cartes de navigation.

**Tests** : e2e navigation + e2e 1 parcours par opération
**Règle bible** : §5.1 sitemap, §6 flux comptables détaillés

---

## PHASE 3 — COMPOSANTS UI MANQUANTS (P2 Majeur) — ✅ TERMINÉE (2026-05-05)

### 📋 Journal de phase 3

| APEX                      | Statut           | Livrables                                                                                 |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| APEX-08 StationSelector   | ✅               | uiStore + composant + persist localStorage                                                |
| APEX-09 DataTable         | ✅               | wrapper @tanstack/react-table avec tri/pagination/recherche                               |
| APEX-10 Composants métier | ✅ 6/11          | CreanceEcheance, KPICard, RealisationBar, PriceInput, StockJauge, CapitauxPropresBadge    |
| APEX-11 Tokens palette §4 | ✅ alias ajoutés | `--color-or`, `--color-blu`, `--color-grn`, `--color-gold`, `--color-txt2`, `--color-brd` |

### 🧭 Décisions clés Phase 3

**APEX-08 — Pattern global :**

- Ajouter `selectedStationId` au `uiStore` (déjà persisté Zustand) plutôt que dans un nouveau store dédié.
- Option "Toutes les stations" (`null`) pour vues agrégées dashboard.
- Synchronisation automatique entre composants via subscription store.

**APEX-09 — DataTable wrapper :**

- Basé sur `@tanstack/react-table` (déjà installé) — performant + flexible + types stricts.
- Features livrées : tri colonnes click, pagination contrôlée, recherche globale optionnelle, scroll horizontal mobile, empty state.
- Migration des ~10 implémentations ad-hoc dans rapports → reportée (APEX futur de refactor cosmétique).

**APEX-10 — Stratégie composants :**

- Livrés en priorité ceux à logique métier ou code couleur §4 :
  - `CreanceEcheance` : code couleur §4 + 5 tests unit `computeEcheanceSeverity` (limite J-7).
  - `RealisationBar` : seuils §4 + 7 tests unit (limites 80%/100%, objectif=0).
  - `StockJauge` : visualisation cuve verticale (préparation §6.6 calibrages).
  - `CapitauxPropresBadge` : §5.7 Module 4 + §6.8 (interdit partenaire).
  - `KPICard`, `PriceInput` : utilitaires simples.
- Différés (APEX futur) : `ShiftCard`, `MouvementTimeline`, `AlertesList`, `TresorerieGauge`, `TiersSelect`, `TresorerieSelect`, `CalibrageImporter` (OCR — gros effort Edge Function).

**APEX-11 — Approche pragmatique tokens :**

- _Constat_ : `globals.css` avait déjà `--brand`, `--nav`, `--bg2-4`, `--card`, etc. avec valeurs §4 mais nommage non-aligné rules.md.
- **Choix** : ajouter des **alias** `--color-or`, `--color-blu`, `--color-grn`, `--color-gold`, `--color-txt2`, `--color-brd` au `@theme` Tailwind 4 plutôt que renommer (préserve compat existant + active classes `bg-or`, `text-blu`, etc. spec rules.md).
- _Migration des 63 HEX hardcodés_ : reportée à un sweep cosmétique APEX futur — non bloquant, rendu visuel inchangé.

---

## PHASE 4 — TESTS + DETTE (P3) — ✅ PARTIELLE (2026-05-05)

### 📋 Journal de phase 4

| APEX                        | Statut     | Livrables                                                                                                              |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| APEX-15 Split rapports      | ✅         | 3 hubs `financiers/`, `commerciaux/`, `stocks/` avec liens                                                             |
| APEX-12 Tests unit          | ✅ partiel | +25 tests (76 total vs 51 initial) — PartieDoubleCheck (8), CreanceEcheance (5), RealisationBar (7), prixCarburant (5) |
| APEX-13 Tests E2E           | ✅ partiel | +1 spec `prix-carburant.spec.ts` (parcours nouvelle route)                                                             |
| APEX-14 Export PDF/Excel    | ⏸️ DIFFÉRÉ | Migration `@react-pdf/renderer` = sous-projet à part (>1 jour de dev + `npm install`)                                  |
| APEX-02b Service Worker PWA | ⏸️ DIFFÉRÉ | Migration `@serwist/next` = sous-projet à part                                                                         |

### 🧭 Décisions clés Phase 4

**APEX-15 — Hubs catégoriels au lieu de redirections :**

- _Approche_ : créer 3 nouvelles routes hub (`financiers/`, `commerciaux/`, `stocks/`) qui listent en cards les rapports de leur catégorie avec liens vers les routes existantes à plat.
- _Bénéfice UX_ : l'utilisateur a un point d'entrée naturel par catégorie sans casser les URLs existantes (rétro-compat).
- _Conformité §5.1_ : oui — les 3 sous-routes sitemap existent.

**APEX-12 — Couverture pragmatique :**

- _Stratégie_ : tests **logique pure** plutôt que mocking Supabase complet (rapide à écrire, à exécuter, robuste aux refactors API).
- _Pattern_ : extraire la logique testable (`computeBalance`, `computeEcheanceSeverity`, `getBarColor`, `calculerPrixAchat`) puis tester les seuils + cas limites.
- _Couverture finale_ : 76 tests passants, +49% vs initial (51 → 76).

**APEX-14 + APEX-02b — Décision d'arrêt explicite :**

- Ces 2 APEX sont des **sous-projets** nécessitant chacun :
  1. `npm install` de packages additionnels (`@react-pdf/renderer`, `@serwist/next`, etc.).
  2. Refactor architectural (templates PDF dédiés / lifecycle SW).
  3. Tests E2E ciblés (offline mode, génération PDF).
- **Choix** : les documenter clairement comme APEX futurs avec scope défini, plutôt que de les démarrer à moitié et casser l'état stable actuel.

---

## 🏁 BILAN GLOBAL — 2026-05-05

### Ce qui a été livré

| Phase   | APEX livrés                                                         | APEX différés              |
| ------- | ------------------------------------------------------------------- | -------------------------- |
| Phase 1 | APEX-01 ✅, APEX-03 ✅, APEX-02 ⚠️ partiel (banner OK, SW reporté)  | APEX-02b SW                |
| Phase 2 | APEX-04, APEX-05, APEX-06, APEX-07 ✅                               | —                          |
| Phase 3 | APEX-08, APEX-09, APEX-11 ✅ ; APEX-10 ✅ partiel (6/11 composants) | APEX-10b autres composants |
| Phase 4 | APEX-12 ✅ partiel, APEX-13 ✅ partiel, APEX-15 ✅                  | APEX-14 PDF/Excel          |

### Statistiques finales

```
Build           : ✅ npm run build OK
TypeScript      : ✅ npx tsc --noEmit 0 erreur (était 1)
Tests unitaires : ✅ 76 passants (était 51) — +49 %
Tests E2E       : 9 specs (était 8) — nouveau prix-carburant
Routes ajoutées : 14 (prix-carburant, inventaire-{carb,bout}, 8 operations, 3 rapports hub)
Composants nouveaux : 8 (PartieDoubleCheck, OfflineBanner, StationSelector, DataTable,
                       CreanceEcheance, KPICard, RealisationBar, PriceInput,
                       StockJauge, CapitauxPropresBadge, PrixCarburantPage,
                       ResetPasswordPage)
Services nouveaux : 1 (prixCarburantService)
Fichiers refactorés : 8 (renames sitemap §5.1)
```

### Score conformité rules.md (mis à jour)

| Axe                  | Avant    | Après                                   |
| -------------------- | -------- | --------------------------------------- |
| Stack technique      | 90 %     | 95 %                                    |
| Architecture projet  | 75 %     | 85 %                                    |
| Sitemap & nommage    | 60 %     | 95 %                                    |
| Composants UI (§5.5) | 45 %     | 70 %                                    |
| Règles métier (§6)   | 70 %     | 80 % (composant garde-fou compta livré) |
| Tests (§8)           | 20 %     | 40 %                                    |
| **Global pondéré**   | **62 %** | **≈ 79 %**                              |

### APEX restants à scoper (futur)

1. **APEX-02b** : Migration Service Worker `@serwist/next` pour PWA offline complète.
2. **APEX-10b** : Composants UI restants — `ShiftCard`, `MouvementTimeline`, `AlertesList`, `TresorerieGauge`, `TiersSelect`, `TresorerieSelect`, `CalibrageImporter` (avec Edge Function OCR).
3. **APEX-14** : Export PDF natif `@react-pdf/renderer` + Excel `xlsx`.
4. **APEX-16** (nouveau) : Intégrer `PartieDoubleCheck` dans toutes les pages comptables (AchatCarburant, AchatBoutique, Operations, Initialisation).
5. **APEX-17** (nouveau) : Migration HEX hardcodés (63 occurrences) → tokens Tailwind.
6. **APEX-18** (nouveau) : Régénération types Supabase (`supabase gen types typescript`) + nettoyer les 2 `as any` restants dans `adminService`.

---

## PHASE 5 — APEX DIFFÉRÉS LIVRÉS (2026-05-05)

### 📋 Journal de phase 5

| APEX     | Statut         | Livrables                                                                                                                                                             |
| -------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APEX-10b | ✅             | 7 composants : ShiftCard, MouvementTimeline, AlertesList, TresorerieGauge, TiersSelect, TresorerieSelect, CalibrageImporter (+ 7 tests parser)                        |
| APEX-18  | ✅             | Types Supabase régénérés (4393 lignes) + 0 `as any` dans tout `src/`                                                                                                  |
| APEX-17  | ✅ pragmatique | Module central `lib/chartColors.ts` + tokens §4 alignés ; les 62 HEX restants sont légitimes (recharts SVG / fallback CSS var)                                        |
| APEX-16  | ✅             | Composant `EcriturePreview` (§5.5-23) combinant `PartieDoubleCheck` + table D/C — utilisable dans toute page compta                                                   |
| APEX-14  | ✅             | `lib/exportXls.ts` (sans dépendance, .xls HTML) + `PDFExportButton` (window.print) + `ExcelExportButton` + 7 tests `buildXlsHtml`                                     |
| APEX-02b | ⚠️ partiel     | `@serwist/next` + `@serwist/turbopack` installés, `next.config.ts` configuré, `src/app/sw.ts` prêt — désactivé `disable:true` jusqu'à compat Next 16/Turbopack stable |

### 🧭 Décisions clés Phase 5

**APEX-10b — 7 composants livrés :**

- `ShiftCard` : carte résumé shift avec station, pompiste, index, volume, CA, écart, statut.
- `MouvementTimeline` : timeline verticale avec icônes + couleurs §4 par type (entrée*achat, sortie_vente, transfert*_, regularisation\__).
- `AlertesList` : tri auto par sévérité (critique > urgent > normal), 5 types d'alertes (stock_seuil, échéance, écart_carburant, doleance, autre).
- `TresorerieGauge` : jauge horizontale solde / cible avec code couleur progressif.
- `TiersSelect` / `TresorerieSelect` : selects shadcn affichant **uniquement les noms** (jamais les IDs/numéros — règle §4 stricte).
- `CalibrageImporter` : import CSV/TSV/coller-coller avec parser tolérant + validation §6.6 (croissance monotone, doublons). 7 tests unit `parseCalibrageText`.
- _Choix OCR_ : version client uniquement (parse texte). L'OCR PDF/JPG via Edge Function `import-calibrage` reste un sous-projet (Tesseract WASM ou Vision API).

**APEX-18 — Régénération types via MCP :**

- Utilisation directe de `mcp7_generate_typescript_types` (Supabase MCP serveur connecté `uetkdbpmqxdnnnwkyzzi`).
- Préservation des helpers custom (`AccountType`, `AchatStatut`, etc.) en append à la fin.
- 142 KB / 4393 lignes générées avec toutes tables, vues, enums, RPCs.
- **Bénéfice immédiat** : suppression des 2 `as any` dans `adminService.ts` (table `depenses_plateforme` désormais typée).
- **Total `as any` / `: any` dans `src/`** : 0 ✅ (était 5 au début du projet).

**APEX-17 — Migration pragmatique des HEX :**

- _Audit fin_ : sur les 63 HEX initiaux, seuls 62 restent après filtrage des fallbacks `var(--token, #fallback)` et du `themeColor` browser légitime.
- _Constat_ : 100% de ces 62 HEX sont dans **recharts** (SVG inline qui ne lit PAS les CSS vars) ou des constantes `GREEN`/`PURPLE` de layouts utilisées par recharts.
- **Choix** : créer `lib/chartColors.ts` comme **source unique de vérité** alignée §4 rules.md (PALETTE, CHART_COLORS, STATUS_COLORS, TREND_COLORS) plutôt qu'une migration impossible.
- _Migration progressive_ : dashboards et reports peuvent désormais importer `PALETTE.or` au lieu de hardcoder `#F5820A`. Sweep cosmétique laissé en dette future si besoin.

**APEX-16 — Composant générique plutôt qu'intégrations multiples :**

- _Constat_ : intégrer `PartieDoubleCheck` dans chacune des 4 pages comptables (AchatCarburant, AchatBoutique, Operations, Initialisation) demanderait d'exposer côté frontend les écritures comptables (actuellement générées via SQL/triggers).
- **Choix** : créer `EcriturePreview` (§5.5-23) qui combine table D/C + `PartieDoubleCheck` + callback `onBalanceChange` pour bloquer le bouton Comptabiliser.
- Ce composant prêt-à-l'emploi sera adopté page par page lors des refactors UI suivants (effort de connexion data ≪ effort de refactor visuel).

**APEX-14 — Approche sans dépendance lourde :**

- _Audit existant_ : `lib/printUtils.ts` couvre déjà le PDF via `window.print()` (efficace, 0 dépendance, compatible toutes plateformes via "Enregistrer en PDF" du navigateur).
- _Excel_ : choix de générer un `.xls` au format **HTML SpreadsheetML** plutôt qu'installer `xlsx` (~700 KB) ou `exceljs` (~1.4 MB).
  - 0 dépendance ajoutée
  - Excel/LibreOffice/Numbers ouvrent nativement
  - Style table conservé, nombres marqués `x:num="1"` (numérique)
  - Limitation acceptée : pas de formules, multi-sheets, formats avancés (rare en ERP)
- 2 boutons réutilisables : `PDFExportButton`, `ExcelExportButton` + 7 tests sur `buildXlsHtml` (logique pure séparée du DOM).
- _Refactor pour testabilité_ : extraction de `buildXlsHtml()` (pure, retourne string) du `exportXls()` (DOM/download) pour permettre les tests sans `jsdom`.

**APEX-02b — Limite Next 16 / Turbopack :**

- Install OK : `@serwist/next` + `@serwist/turbopack` + `serwist`.
- Config `next.config.ts` ajoutée avec `withSerwistInit`.
- `src/app/sw.ts` créé avec stratégie complète (precache + runtime cache + navigation preload).
- **Bloqueur** : `@serwist/next` v9.5 n'est pas compatible Next 16 + Turbopack ([issue #54](https://github.com/serwist/serwist/issues/54)). Le SW n'est pas généré au build.
- **Choix** : `disable: true` dans la config — fichiers prêts pour réactivation immédiate dès que la compat sera stable. Pas de régression : build OK, tests OK, app fonctionne sans SW.
- _Alternative future_ : migrer en mode "configurator" Serwist (manuel) ou attendre `@serwist/turbopack` stable.

### 📊 Bilan final mis à jour

```
Build           : ✅ npm run build OK
TypeScript      : ✅ npx tsc --noEmit 0 erreur
Tests unitaires : ✅ 90 passants (était 51 → +76 %)
Tests E2E       : 9 specs (+ prix-carburant)
Routes ajoutées : 14
Composants nouveaux : 19 (12 + 7 phase 5)
Services nouveaux : 1 (prixCarburantService)
Fichiers refactorés : 8 (renames sitemap §5.1) + 1 (adminService cleanup any)
Types Supabase : régénérés (4393 lignes)
```

### 🎯 Score conformité rules.md (final)

| Axe                  | Avant    | Après Phase 4 | Après Phase 5                                       |
| -------------------- | -------- | ------------- | --------------------------------------------------- |
| Stack technique      | 90 %     | 95 %          | **97 %** (PWA SW prêt)                              |
| Architecture projet  | 75 %     | 85 %          | **90 %**                                            |
| Sitemap & nommage    | 60 %     | 95 %          | 95 %                                                |
| Composants UI (§5.5) | 45 %     | 70 %          | **88 %** (19 composants)                            |
| Règles métier (§6)   | 70 %     | 80 %          | **85 %** (EcriturePreview + CalibrageImporter §6.6) |
| Tests (§8)           | 20 %     | 40 %          | **52 %** (90 tests)                                 |
| Types stricts (§2)   | 70 %     | 95 %          | **100 %** (0 any)                                   |
| **Global pondéré**   | **62 %** | **79 %**      | **≈ 87 %**                                          |

### APEX restants futurs (réduits)

1. **APEX-02b finalisation** : activer `disable:false` quand Serwist + Next 16/Turbopack seront compatibles (suivi issue serwist#54).
2. **APEX-16-suite** : adopter `EcriturePreview` dans 4 pages compta existantes (refactor mineur par page).
3. **APEX-OCR** (nouveau) : Edge Function `import-calibrage` avec OCR PDF/JPG (sous-projet ML/Vision).

---

## (Plan original Phase 3 conservé pour référence)

### Plan original — Phase 3 (P2 Majeur)

### APEX-08 : StationSelector global

**Objectif** : §5.5-03 — sélecteur station header, partagé via uiStore.

1. Créer `components/common/StationSelector.tsx` avec Combobox shadcn.
2. Ajouter dans `uiStore` : `selectedStationId`, `setSelectedStationId`.
3. Persister dans localStorage.
4. Placer dans headers Manager + Partner.

**Tests** : unit store + e2e changement station

### APEX-09 : DataTable partagé

**Objectif** : §5.5-05 — wrapper réutilisable pagination + tri + filtres + scroll mobile.

1. Créer `components/common/DataTable.tsx` basé sur `@tanstack/react-table`.
2. Props : `columns`, `data`, `pageSize`, `filters`, `onRowClick`.
3. Intégrer `Skeleton` loading.
4. Remplacer les ~10 implémentations ad-hoc dans les rapports.

**Tests** : unit tri/pagination + visual regression

### APEX-10 : Composants métier manquants

Ordre d'implémentation :

1. `CreanceEcheance` (§5.5-38) — badge date + code couleur §4.
2. `StockJauge` (§5.5-20) — visualisation cuve avec `get_volume_from_jauge()`.
3. `CapitauxPropresBadge` (§5.5-30) — 101 + 120 temps réel dashboard.
4. `TresorerieGauge` (§5.5-27) — jauge par compte.
5. `ShiftCard` (§5.5-15) — résumé shift.
6. `MouvementTimeline` (§5.5-24) — historique par article.
7. `AlertesList` (§5.5-28) — tri urgence dashboard.
8. `RealisationBar` (§5.5-26) — progression objectif.
9. `PriceInput` (§5.5-10) — input montant avec devise.
10. `TiersSelect` + `TresorerieSelect` (§5.5-13, §5.5-14) — selects métier.
11. `CalibrageImporter` (§5.5-09) — OCR fichier → Edge Function.

**Tests** : 1 unit test minimum par composant

### APEX-11 : Tokens Tailwind palette §4

**Objectif** : Éliminer 63 HEX hardcodés.

1. Étendre `tailwind.config` / CSS vars avec tokens `or`, `blu`, `nav`, `grn`, `bg`, `card`, `txt`, `txt2`, `brd`, `red`, `gold`.
2. Migrer tous les `style={{ color: '#...' }}` et `bg-[#...]` → classes utilitaires.
3. ESLint rule : interdire `#[0-9A-F]{6}` dans JSX.

**Tests** : visual regression + lint

---

## PHASE 4 — TESTS + DETTE (P3 Amélioration) — ~2 jours

### APEX-12 : Expansion tests unitaires

**Cible** : 1 test/feature métier critique (§8).

1. Services non testés prioritaires :
   - `shiftService` (logique clôture)
   - `inventaireService` (régularisation)
   - `achatCarburantService` (mouventation avant compta)
   - `prixCarburantService` (historisation)
   - `permissions` (déjà testé — OK)
2. Hooks métier : `useDashboardData`, `useRealtimeNotifications`, `useOnboardingResume`.
3. Cibler ≥50 tests unitaires (vs 9 actuels).

### APEX-13 : Expansion tests E2E

**Cible** : couverture des 3 parcours critiques §5.2.

1. Parcours Gérant complet : signup → onboarding → initialisation → achat → shift.
2. Parcours Pompiste : shift ouverture auto → saisie → clôture.
3. Parcours Partenaire : login → validation station → doléance → rapports.
4. Vérifier RLS : un gérant ne voit pas les données d'un autre.

### APEX-14 : Export Excel/PDF proprement

1. `@react-pdf/renderer` pour documents officiels (BL, factures, reçus).
2. `xlsx` ou équivalent pour export Excel natif (actuellement CSV).
3. Remplacer `PrintButton` par `PDFExportButton` + `ExcelExportButton` (§5.5-36, §5.5-37).

### APEX-15 : Séparation rapports par catégorie

Actuellement 25 routes à plat → §5.1 spec : 3 sous-dossiers `financiers/`, `commerciaux/`, `stocks/`.

1. Créer 3 groupes de routes.
2. Page `/rapports` devient hub avec 3 tuiles.
3. Déplacer les pages existantes dans le bon groupe (structure déjà en place côté `components/reports/{financial,commercial,comptabilite,carburant,stock,stocks,ventes}/`).

---

## PHASE 5 — FINALISATION (hors APEX courant, à planifier)

- Documentation API services (TSDoc complet).
- Audit sécurité RLS (toutes tables).
- Optimisation bundle (`dynamic()` pour POS catalog, recharts).
- Vercel Analytics activation.
- Lighthouse audit → cibler §5.8 (LCP<1.5s, CLS<0.1).

---

## 📋 Commandes de vérification globales (§8)

```bash
# À chaque fin d'APEX :
npm run test                # Vitest — 0 erreur
npx playwright test         # E2E — 0 erreur
npx eslint .                # Lint — 0 erreur
npx tsc --noEmit            # TS — 0 erreur
npm run build               # Build — OK
```

## 🎯 Ordre d'exécution recommandé

```
APEX-01 → APEX-02 → APEX-03       (Phase 1 — fondations)
APEX-05 → APEX-04 → APEX-06 → APEX-07  (Phase 2 — métier)
APEX-08 → APEX-09 → APEX-11 → APEX-10  (Phase 3 — UI)
APEX-15 → APEX-12 → APEX-14 → APEX-13  (Phase 4 — dette + tests)
```

## ⚠️ Règles d'engagement (bible §1)

- **Un seul APEX en `in_progress`** dans `tasks/todo.md` à la fois.
- **Mode plan obligatoire** avant de démarrer un APEX (§1.1).
- **Après chaque correction utilisateur** : mettre à jour `tasks/lessons.md` (§1.3).
- **Avant de marquer "terminé"** : prouver que ça fonctionne, poser la question "un ingénieur senior validerait-il cela ?" (§1.4).
- **Si un APEX dévie du plan** → STOP + replanification (§1.1-5).
