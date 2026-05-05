# Audit Comptabilité - SUCCESSFUEL (ANCIEN)

> Date: 2026-05-05
> Répertoire: /Users/mac/Documents/WORK/newsuccessfuel/successfuel
> Stack: React + Vite, TypeScript, Tailwind, Supabase, TanStack Router

## 1. COMPOSANTS RAPPORTS

### 1.1 Composants Core Rapports

#### reportDefinitions.ts
- **Emplacement**: `src/components/reports/reportDefinitions.ts`
- **Fonction**: Métadonnées des rapports (données mock — pas de backend)
- **Fonctionnalités**:
  - Définit les slugs de rapports: grand-livre, balance, journal, sessions, encaissements
  - Définit les colonnes avec formats (text, number, currency, volume)
  - Fonctions mock pour demoLedgerRows, demoBalanceRows, demoJournalRows, demoSessionsRows, demoEncaissementsRows
  - Fonction columnShouldTotalize pour déterminer si une colonne doit être totalisée
- **Interface**: `ReportDefinition`, `ReportColumn`, `ReportSlug`
- **Note**: Données mock uniquement, pas de connexion backend réelle

#### ReportLayout.tsx
- **Emplacement**: `src/components/reports/ReportLayout.tsx`
- **Fonction**: Layout de base pour les rapports

#### ReportFilters.tsx
- **Emplacement**: `src/components/reports/ReportFilters.tsx`
- **Fonction**: Filtres pour les rapports

#### ReportTable.tsx
- **Emplacement**: `src/components/reports/ReportTable.tsx`
- **Fonction**: Table générique pour les rapports

#### GenericReportPage.tsx
- **Emplacement**: `src/components/reports/GenericReportPage.tsx`
- **Fonction**: Page générique pour les rapports

### 1.2 Rapports Financiers

#### financialReportPages.tsx
- **Emplacement**: `src/components/reports/financial/financialReportPages.tsx`
- **Fonction**: Pages de rapports financiers (4 pages)
- **Pages**:
  - `FinancialNetAssetPage()`: Actif net (trésorerie, stocks, créances, immobilisations, dettes)
  - `FinancialSituationPage()`: Situation financière (balance débit/crédit par section)
  - `FinancialCashFlowPage()`: Flux de trésorerie (entrées/sorties classe 5)
  - `FinancialSimplifiedResultPage()`: Résultat simplifié (produits vs charges)
- **Fonctionnalités**:
  - KPI cards pour affichage des indicateurs
  - Filtres par période et station
  - Table avec pagination (useReactTable)
  - Vue comptes (all/assets/liabilities)
- **Services utilisés**: `getNetAsset`, `getFinancialSituation`, `getCashFlow`, `getSimplifiedResult` (financialReportService)

#### FinancialReportsRoutes.tsx
- **Emplacement**: `src/components/reports/financial/FinancialReportsRoutes.tsx`
- **Fonction**: Routes pour les rapports financiers

### 1.3 Rapports Commerciaux

#### commercialReportPages.tsx
- **Emplacement**: `src/components/reports/commercial/commercialReportPages.tsx`
- **Fonction**: Pages de rapports commerciaux
- **Taille**: 13,711 bytes

#### CommercialReportsHub.tsx
- **Emplacement**: `src/components/reports/commercial/CommercialReportsHub.tsx`
- **Fonction**: Hub pour les rapports commerciaux

#### CommercialReportsRoutes.tsx
- **Emplacement**: `src/components/reports/commercial/CommercialReportsRoutes.tsx`
- **Fonction**: Routes pour les rapports commerciaux

#### CommercialReportFiltersBar.tsx
- **Emplacement**: `src/components/reports/commercial/CommercialReportFiltersBar.tsx`
- **Fonction**: Barre de filtres pour rapports commerciaux

### 1.4 Rapports Stocks

#### stockReportPages.tsx
- **Emplacement**: `src/components/reports/stock/stockReportPages.tsx`
- **Fonction**: Pages de rapports stocks

#### StockReportsHub.tsx
- **Emplacement**: `src/components/reports/stock/StockReportsHub.tsx`
- **Fonction**: Hub pour les rapports stocks

#### StockReportsRoutes.tsx
- **Emplacement**: `src/components/reports/stock/StockReportsRoutes.tsx`
- **Fonction**: Routes pour les rapports stocks

#### StockReportFiltersBar.tsx
- **Emplacement**: `src/components/reports/stock/StockReportFiltersBar.tsx`
- **Fonction**: Barre de filtres pour rapports stocks

#### StockReportLayout.tsx
- **Emplacement**: `src/components/reports/stock/StockReportLayout.tsx`
- **Fonction**: Layout pour les rapports stocks

#### PremiumReportTable.tsx
- **Emplacement**: `src/components/reports/stock/PremiumReportTable.tsx`
- **Fonction**: Table premium pour rapports stocks

### 1.5 Hub Métadonnées

#### reportHubMeta.ts
- **Emplacement**: `src/components/reports/reportHubMeta.ts`
- **Fonction**: Métadonnées des hubs de rapports

## 2. SERVICES COMPTABILITÉ

### 2.1 Services Financiers

#### financialReportService.ts
- **Emplacement**: `src/services/financialReportService.ts`
- **Fonction**: Service pour les rapports financiers métier
- **Fonctions**:
  - `getNetAsset()`: Actif net (trésorerie, stocks, créances, immobilisations, dettes, compte 108)
  - `getFinancialSituation()`: Situation financière (assets vs liabilities)
  - `getCashFlow()`: Flux de trésorerie (mouvements classe 5)
  - `getSimplifiedResult()`: Résultat simplifié (produits vs charges opérationnel)
  - `getIncomeStatementKpis()`: Compte de résultat simplifié (5 KPIs: CA, marge brute, VA, EBE, résultat net)
- **Fonctionnalités**:
  - RPC Supabase: `get_trial_balance`, `get_manager_capital_treasury_effect`, `get_net_asset_components_at`
  - Vue `v_account_movements` pour agrégation par familles de comptes (61-76)
  - Scoping tenant pour purchase_orders
- **Interfaces**: `NetAssetBreakdown`, `FinancialSituation`, `CashFlowResult`, `SimplifiedResult`, `IncomeStatementKpis`
- **Note**: Architecture métier complexe avec gestion du compte 108 (opérations durables gérant)

#### commercialReportService.ts
- **Emplacement**: `src/services/commercialReportService.ts`
- **Fonction**: Service pour les rapports commerciaux

#### stockReportService.ts
- **Emplacement**: `src/services/stockReportService.ts`
- **Fonction**: Service pour les rapports stocks

#### grandLivreReportService.ts
- **Emplacement**: `src/services/grandLivreReportService.ts`
- **Fonction**: Service pour le grand livre

### 2.2 Services Opérations

#### managerOperationsService.ts
- **Emplacement**: `src/services/managerOperationsService.ts`
- **Fonction**: Service pour les opérations manager

#### manualOperationsService.ts
- **Emplacement**: `src/services/manualOperationsService.ts`
- **Fonction**: Service pour les opérations manuelles

#### salaryOperationsService.ts
- **Emplacement**: `src/services/salaryOperationsService.ts`
- **Fonction**: Service pour les opérations salaires

## 3. COMPOSANTS OPÉRATIONS

### 3.1 Page Principale

#### ManagerNonSalesOperationsPage.tsx
- **Emplacement**: `src/components/manager/ManagerNonSalesOperationsPage.tsx`
- **Fonction**: Page principale des opérations hors achat/vente

#### ManagerOperationsPage.tsx
- **Emplacement**: `src/components/manager/ManagerOperationsPage.tsx`
- **Fonction**: Page des opérations manager

#### TraitementOperationsPage.tsx
- **Emplacement**: `src/components/manager/TraitementOperationsPage.tsx`
- **Fonction**: Page traitement opérations

#### TraitementHorsOperationsPage.tsx
- **Emplacement**: `src/components/manager/TraitementHorsOperationsPage.tsx`
- **Fonction**: Page traitement hors opérations

### 3.2 Dialogs Opérations (noperations)

#### Structure
- **Emplacement**: `src/components/manager/noperations/`
- **Sous-dossiers**:
  - `ChargesCourantes/` (1 item): ChargesCourantesTab.tsx
  - `Creances/` (1 item)
  - `Fournisseurs/` (1 item)
  - `Gerant/` (1 item): GerantOperationsTab.tsx
  - `Immobilisations/` (1 item)
  - `Salaires/` (1 item)
  - `VirementInterne/` (1 item)
  - `shared/` (8 items): OperationAlert.tsx, OperationTooltip.tsx, etc.

#### ChargesCourantesTab.tsx
- **Emplacement**: `src/components/manager/noperations/ChargesCourantes/ChargesCourantesTab.tsx`
- **Taille**: 1,363 bytes

#### GerantOperationsTab.tsx
- **Emplacement**: `src/components/manager/noperations/Gerant/GerantOperationsTab.tsx`
- **Fonction**: Tab pour opérations gérant

#### OperationAlert.tsx
- **Emplacement**: `src/components/manager/noperations/shared/OperationAlert.tsx`
- **Fonction**: Alerte pour opérations

#### OperationTooltip.tsx
- **Emplacement**: `src/components/manager/noperations/shared/OperationTooltip.tsx`
- **Fonction**: Tooltip pour opérations

## 4. RAPPORTS MANAGER

### 4.1 Pages Rapports

#### ManagerReportsPage.tsx
- **Emplacement**: `src/components/manager/ManagerReportsPage.tsx`
- **Fonction**: Page principale des rapports manager

#### ReportBugPage.tsx
- **Emplacement**: `src/components/manager/ReportBugPage.tsx`
- **Fonction**: Page de report de bugs

## 5. ROUTES

### 5.1 Routes Rapports

#### /manager/reports/
- **Emplacement**: `src/routes/manager/reports/`
- **Fichiers**:
  - `$reportSlug.tsx`: Route dynamique pour les rapports
  - Autres fichiers de routes

#### /manager/reports/grand-livre
- Route pour le grand livre

#### /manager/reports/balance
- Route pour la balance

### 5.2 Routes Opérations

#### /manager/operations/
- **Emplacement**: `src/routes/manager/operations/`
- **Fichiers**: Routes pour les différentes opérations

#### /manager/traitement/operations
- **Emplacement**: `src/routes/manager/traitement/operations.tsx`

#### /manager/traitement/hors-operations
- **Emplacement**: `src/routes/manager/traitement/hors-operations.tsx`

## 6. STRUCTURE COMPTES

### 6.1 Structure Comptes

#### StructureComptesPage.tsx
- **Emplacement**: `src/components/manager/StructureComptesPage.tsx`
- **Fonction**: Gestion de la structure des comptes

#### /manager/structure/comptes
- **Emplacement**: `src/routes/manager/structure/comptes.tsx`
- **Fonction**: Route pour la structure des comptes

## 7. DOCUMENTATION

### 7.1 Documentation Comptabilité

#### COMPTABILITE_PRINCIPE_SUCCESSFUEL.txt
- **Emplacement**: `successfuel/txt/COMPTABILITE_PRINCIPE_SUCCESSFUEL.txt`
- **Fonction**: Documentation des principes comptables SuccessFuel

#### DOC_COMPTA_SUCCESSFUEL.txt
- **Emplacement**: `successfuel/txt/DOC_COMPTA_SUCCESSFUEL.txt`
- **Fonction**: Documentation comptabilité SuccessFuel

### 7.2 Documentation Audit

#### SUCCESSFUEL_ACCOUNTING_AND_STOCK_ENGINE_AUDIT.md
- **Emplacement**: `successfuel/md/SUCCESSFUEL_ACCOUNTING_AND_STOCK_ENGINE_AUDIT.md`
- **Fonction**: Audit du moteur comptabilité et stock

#### AUDIT_SUPABASE_SUCCESSFUEL.md
- **Emplacement**: `successfuel/md/AUDIT_SUPABASE_SUCCESSFUEL.md`
- **Fonction**: Audit Supabase SuccessFuel

#### SUCCESSFUEL_FULL_AUDIT.md
- **Emplacement**: `successfuel/md/SUCCESSFUEL_FULL_AUDIT.md`
- **Fonction**: Audit complet SuccessFuel

#### SUCCESSFUEL_FRONTEND_AUDIT.md
- **Emplacement**: `successfuel/md/SUCCESSFUEL_FRONTEND_AUDIT.md`
- **Fonction**: Audit frontend SuccessFuel

#### AUDIT_TECHNIQUE_SUCCESSFUEL_2.0.md
- **Emplacement**: `successfuel/md/AUDIT_TECHNIQUE_SUCCESSFUEL_2.0.md`
- **Fonction**: Audit technique SuccessFuel 2.0

#### SUCCESSFUEL_ACCOUNT_RESTRUCTURE_AUDIT.md
- **Emplacement**: `successfuel/docs/SUCCESSFUEL_ACCOUNT_RESTRUCTURE_AUDIT.md`
- **Fonction**: Audit restructure comptes SuccessFuel

## 8. DESIGN DOCUMENTS

### 8.1 Design Rapports

#### ACTION-reports-design.md
- **Emplacement**: `successfuel/ACTION-reports-design.md`
- **Fonction**: Action items pour design des rapports

#### MEMORY-reports-design.md
- **Emplacement**: `successfuel/MEMORY-reports-design.md`
- **Fonction**: Mémoire pour design des rapports

#### TODO-reports-design.md
- **Emplacement**: `successfuel/TODO-reports-design.md`
- **Fonction**: TODO pour design des rapports

## SYNTHÈSE

### Points Forts
- ✅ Architecture modulaire avec hubs de rapports (commercial, financial, stock)
- ✅ Métadonnées de rapports centralisées (reportDefinitions.ts)
- ✅ Services financiers métier avancés (financialReportService.ts)
- ✅ Gestion du compte 108 (opérations durables gérant)
- ✅ RPC Supabase pour calculs complexes (get_net_asset_components_at, get_manager_capital_treasury_effect)
- ✅ Agrégation par familles de comptes (61-76) pour compte de résultat
- ✅ KPIs direction (CA, marge brute, VA, EBE, résultat net)
- ✅ Documentation comptabilité complète

### Architecture
- **Composants Rapports**: 13 composants core
- **Rapports Financiers**: 4 pages (Actif net, Situation, Cash flow, Résultat simplifié)
- **Rapports Commerciaux**: 4 composants (Hub, Routes, Pages, Filters)
- **Rapports Stocks**: 6 composants (Hub, Routes, Pages, Filters, Layout, Premium table)
- **Services**: 4 services (financial, commercial, stock, grandLivre, manager, manual, salary)
- **Opérations**: 8 sous-dossiers (ChargesCourantes, Creances, Fournisseurs, Gerant, Immobilisations, Salaires, VirementInterne, shared)
- **Routes**: Multiples routes pour rapports et opérations
- **Documentation**: 8 fichiers de documentation

### Différences Clés vs NOUVEAU
- **Stack**: React + Vite + TanStack Router vs Next.js 16 App Router
- **Rapports**: Architecture hub-based vs pages directes dans NOUVEAU
- **Services**: Plus avancés dans ANCIEN (RPC Supabase, compte 108, KPIs direction)
- **Composants Comptabilité**: Aucun composant de vérification partie double dans ANCIEN
- **Données**: Mock data dans ANCIEN vs données réelles Supabase dans NOUVEAU
- **Architecture**: Plus complexe et sophistiquée dans ANCIEN

### Total Fichiers Comptabilité
- Composants Rapports: 13
- Pages Financières: 4
- Pages Commerciales: 4
- Pages Stocks: 6
- Services: 7
- Opérations: ~15 composants
- Routes: ~10
- Documentation: 8
- **Total**: ~67 fichiers
