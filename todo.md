# TODO — SuccessFuel ERP

## ✅ DONE

### ÉTAPE 1-5 : Setup & Configuration
- [x] Projet Next.js créé (TypeScript, Tailwind, App Router)
- [x] Dépendances installées (shadcn/ui, Supabase, TanStack Query, Zustand, next-intl, next-pwa)
- [x] Configuration Supabase (client/server/proxy)
- [x] Types Supabase générés et corrigés (supabase.ts)
- [x] i18n configuré (fr/en)
- [x] PWA manifest.json
- [x] Layouts (manager, admin, partner, auth, onboarding)

### ÉTAPE 6 : Authentification
- [x] LoginPage
- [x] SignupPage
- [x] AuthProvider + hooks
- [x] ProtectedRoute / RoleGuard
- [x] Stores Zustand (authStore, uiStore)

### ÉTAPE 7 : Onboarding
- [x] CompanyCreationForm
- [x] CreateStationsForm
- [x] FuelTankCalibrationPage
- [x] OnboardingPumpsPage
- [x] StationCommercialProfilePage
- [x] WaitingValidationPage

### ÉTAPE 8 : Structure
- [x] StructureComptesPage
- [x] StructureTiersPage
- [x] StructureArticlesPage
- [x] StructureCarburantsPage
- [x] StructureServicesPage
- [x] StructureTresoreriePage
- [x] StructureCamionsPage
- [x] StructureObjectifsPage

### ÉTAPE 9 : Initialisation
- [x] CompanyInitialisationPage

### ÉTAPE 10 : Traitement
- [x] AchatCarburantPage (4 onglets : BC, paiements, réceptions, BL/facture)
- [x] VenteCarburantPage (shifts carburant)
- [x] AchatBoutiquePage
- [x] ManagerShopSalesPage (POS boutique)
- [x] ManagerStockTransferPage
- [x] InventairePage (carburant + boutique)
- [x] DoleancesPage
- [x] ManagerNonSalesOperationsPage

### ÉTAPE 11 : Rapports
- [x] ManagerRapportsPage (hub navigation)
- [x] ReportLayout + ReportFilters + exportCsv
- [x] VentesCarburantReport
- [x] VentesBoutiqueReport
- [x] CaJournalierReport
- [x] BilanShiftsReport
- [x] StockCarburantReport
- [x] StockBoutiqueReport
- [x] MouvementsStockReport
- [x] GrandLivreReport
- [x] BalanceReport
- [x] TresorerieReport
- [x] CreancesDettesReport
- [x] ConsommationReport
- [x] AchatsCarburantReport
- [x] CmupReport
- [x] 14 routes /manager/rapports/[slug]

### ÉTAPE 12 : Dashboards
- [x] ManagerDashboardPage (CA courbe, trésorerie pie, alertes stock, créances/dettes)
- [x] PartnerDashboardPage (CA barres, écarts courbe, doléances, performance stations)

### ÉTAPE 13 : Tests
- [x] vitest.config.ts
- [x] businessLogic.test.ts (CMUP, CA shift, partie double, écart caisse, stock)
- [x] exportCsv.test.ts
- [x] utils.test.ts
- [x] 28 tests passants

### Qualité
- [x] TypeScript strict (0 erreur tsc --noEmit)
- [x] Build production (npx next build) → succès

## 🔲 TODO (Futures améliorations)

### ÉTAPE 14 : Déploiement Vercel
- [ ] vercel.json (rewrite rules)
- [ ] Variables d'environnement Vercel
- [ ] Déploiement initial

### ÉTAPE 15 : Documentation complémentaire
- [ ] Mise à jour rules.md avec décisions finales
- [ ] Tests E2E Playwright (auth, onboarding, ventes)

### Composants Admin (basse priorité)
- [ ] SuperAdminDashboardPage complète (KPIs globales)
- [ ] AdminAuditLogsPage (filtres + export)
- [ ] AdminBugReportsPage

### Améliorations rapports
- [ ] Export PDF (react-pdf ou puppeteer edge function)
- [ ] Rapports comparatifs N vs N-1
- [ ] Réalisations vs objectifs (rapport dédié)
- [ ] Top articles vendus

### Notifications temps réel
- [ ] NotificationCenter via Supabase Realtime
- [ ] Doléances en temps réel
