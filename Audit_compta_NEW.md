# Audit Comptabilité - SRC (NOUVEAU)

> Date: 2026-05-05
> Répertoire: /Users/mac/Documents/WORK/newsuccessfuel/src
> Stack: Next.js 16 App Router, TypeScript strict, Tailwind, shadcn/ui, Supabase

## 1. COMPOSANTS COMPTABILITÉ

### 1.1 Composants Core

#### ComptabiliserAchatDialog.tsx
- **Emplacement**: `src/components/compta/ComptabiliserAchatDialog.tsx`
- **Fonction**: Dialog d'aperçu et confirmation de comptabilisation d'un achat
- **Fonctionnalités**:
  - Affiche les écritures comptables qui seront générées (D/C par compte)
  - Utilise `PartieDoubleCheck` pour bloquer la validation si déséquilibrée
  - Fonction `buildAchatLignes` exportée pour tests unitaires
  - Règle § 6.1: Débit "Achats" = montant facture, Crédit "Trésorerie" = total payé, Crédit "Fournisseur" = reste à payer
- **Interface**: `ComptabiliserAchatDialogProps` avec montantFacture, totalPaye, libelleTresorerie, libelleAchat, libelleFournisseur
- **Tests**: `src/components/compta/__tests__/ComptabiliserAchatDialog.test.ts`

#### EcriturePreview.tsx
- **Emplacement**: `src/components/compta/EcriturePreview.tsx`
- **Fonction**: Aperçu d'une écriture comptable avant validation
- **Fonctionnalités**:
  - Tableau des lignes (compte libellé, débit, crédit)
  - Composant `PartieDoubleCheck` qui vérifie ∑D = ∑C
  - Règle §6.1: numéros de comptes invisibles en frontend SAUF Grand Livre/Balance
- **Interface**: `EcriturePreviewProps` avec lignes, title, description, currency, onBalanceChange

#### PartieDoubleCheck.tsx
- **Emplacement**: `src/components/compta/PartieDoubleCheck.tsx`
- **Fonction**: Indicateur ∑ Débits = ∑ Crédits (§6.1 rules.md — règle BLOQUANTE)
- **Fonctionnalités**:
  - Composant de garde-fou comptable à utiliser dans TOUTE interface produisant une écriture
  - Expose `isBalanced` via props `onBalanceChange` pour permettre au parent de bloquer le bouton "Comptabiliser"
  - Fonction `computeBalance` exportée pour vérification côté logique métier
  - Tolérance d'arrondi monétaire (par défaut 0.01)
- **Interface**: `PartieDoubleCheckProps` avec debits, credits, onBalanceChange, tolerance, currency

### 1.2 Tests Comptabilité

#### ComptabiliserAchatDialog.test.ts
- **Emplacement**: `src/components/compta/__tests__/ComptabiliserAchatDialog.test.ts`
- **Tests**: Tests unitaires pour buildAchatLignes

#### dialogLignes.test.ts
- **Emplacement**: `src/components/compta/__tests__/dialogLignes.test.ts`
- **Tests**: Tests pour les dialogues de lignes

## 2. RAPPORTS COMPTABILITÉ

### 2.1 Rapports Financiers

#### CompteResultatReport.tsx
- **Emplacement**: `src/components/reports/financial/CompteResultatReport.tsx`
- **Fonction**: Compte de résultat (Charges classe 6 et Produits classe 7)
- **Fonctionnalités**:
  - Filtre par période et station
  - Affiche charges et produits séparément
  - Calcul du résultat net (Produits - Charges)
  - Indicateur bénéfice/perte avec badge
  - Export CSV
- **Source**: `vue_grand_livre` (comptes 6xx et 7xx)
- **Interface**: `CompteLigne` avec libelle_compte, solde, classe

#### BilanReport.tsx
- **Emplacement**: `src/components/reports/financial/BilanReport.tsx`
- **Fonction**: Bilan (Situation patrimoniale à une date donnée)
- **Fonctionnalités**:
  - Date de référence paramétrable
  - Classification automatique des comptes par section (Immobilisations, Stocks, Créances, Trésorerie, Capital, Dettes)
  - Vérification de l'équilibre Actif = Passif
  - Affichage par section avec sous-totaux
  - Export CSV
- **Source**: `vue_grand_livre` (cumulatif depuis inception)
- **Fonction**: `classifyAccount(num)` pour mapper numéro → section

#### Situation460Report.tsx
- **Emplacement**: `src/components/reports/financial/Situation460Report.tsx`
- **Fonction**: Rapport situation compte 460 (Créances employés)

### 2.2 Rapports Comptabilité

#### BalanceReport.tsx
- **Emplacement**: `src/components/reports/comptabilite/BalanceReport.tsx`
- **Fonction**: Balance des comptes (Totaux débit/crédit et soldes par compte)
- **Fonctionnalités**:
  - Filtre par période et station
  - Calcul des soldes débiteurs et créditeurs
  - Totaux globaux
  - Export CSV
- **Source**: `vue_grand_livre` (agrégat par compte sur période)

#### GrandLivreReport.tsx
- **Emplacement**: `src/components/reports/comptabilite/GrandLivreReport.tsx`
- **Fonction**: Grand Livre (Écritures comptables chronologiques par compte)
- **Fonctionnalités**:
  - Filtre par période, station et compte (N°)
  - Affiche date, pièce, compte, libellé, tiers, débit, crédit
  - Totaux débit/crédit
  - Export CSV
- **Source**: `vue_grand_livre` (limité à 500 écritures)
- **Note**: Affiche les numéros de comptes (exception à la règle §6.1)

#### CreancesDettesReport.tsx
- **Emplacement**: `src/components/reports/comptabilite/CreancesDettesReport.tsx`
- **Fonction**: Rapport créances et dettes

#### TresorerieReport.tsx
- **Emplacement**: `src/components/reports/comptabilite/TresorerieReport.tsx`
- **Fonction**: Rapport trésorerie

## 3. OPÉRATIONS HORS VENTE

### 3.1 Page Principale

#### ManagerNonSalesOperationsPage.tsx
- **Emplacement**: `src/components/manager/noperations/ManagerNonSalesOperationsPage.tsx`
- **Fonction**: Page principale des opérations hors achat/vente (8 dialogs)
- **Fonctionnalités**:
  - Dialogs: Salaires, Charges courantes, Charges fiscales, Encaissement créances, Réglement dettes, Immobilisations, Virement interne, Opérations gérant
  - Tabs pour différents types d'opérations

### 3.2 Dialogs Opérations

#### SalairesDialog.tsx
- **Emplacement**: `src/components/manager/noperations/SalairesDialog.tsx`
- **Fonction**: Gestion des salaires employés
- **Taille**: 23,544 bytes

#### ChargesCourantesDialog.tsx
- **Emplacement**: `src/components/manager/noperations/ChargesCourantesDialog.tsx`
- **Fonction**: Gestion des charges courantes
- **Taille**: 19,755 bytes

#### EncaissementCreancesDialog.tsx
- **Emplacement**: `src/components/manager/noperations/EncaissementCreancesDialog.tsx`
- **Fonction**: Encaissement des créances clients
- **Taille**: 13,260 bytes

#### ReglementDettesDialog.tsx
- **Emplacement**: `src/components/manager/noperations/ReglementDettesDialog.tsx`
- **Fonction**: Règlement des dettes fournisseurs
- **Taille**: 14,204 bytes

#### ImmobilisationsDialog.tsx
- **Emplacement**: `src/components/manager/noperations/ImmobilisationsDialog.tsx`
- **Fonction**: Gestion des immobilisations
- **Taille**: 20,995 bytes

#### OperationsGerantDialog.tsx
- **Emplacement**: `src/components/manager/noperations/OperationsGerantDialog.tsx`
- **Fonction**: Opérations spécifiques gérant
- **Taille**: 13,340 bytes

### 3.3 Pages Opérations (Routes)

#### Page principale operations
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/page.tsx`

#### Virement interne
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/virement-interne/page.tsx`

#### Salaires
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/salaires/page.tsx`

#### Encaissement créances
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/encaissement-creances/page.tsx`

#### Immobilisations
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/immobilisations/page.tsx`

#### Réglement dettes
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/reglement-dettes/page.tsx`

#### Charges fiscales
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/charges-fiscales/page.tsx`

#### Charges courantes
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/charges-courantes/page.tsx`

#### Opérations gérant
- **Emplacement**: `src/app/(manager)/manager/traitements/operations/operations-gerant/page.tsx`

## 4. SERVICES COMPTABILITÉ

### 4.1 Services

#### comptesService.ts
- **Emplacement**: `src/services/comptesService.ts`
- **Fonction**: Service pour la gestion des comptes
- **Fonctions**:
  - `getChargeAccounts(entrepriseId)`: Récupère les comptes de charges (600-699)
  - `getImmobilisationAccounts()`: Récupère les comptes d'immobilisations (200-299)
  - `getStandardByNumero(numero)`: Récupère un compte standard par numéro
- **Type**: `CompteStandard = { numero: string; libelle: string; classe: number }`

#### achatBoutiqueService.ts
- **Emplacement**: `src/services/achatBoutiqueService.ts`
- **Fonction**: Service pour les achats boutique
- **Fonctions**:
  - `createAchatBoutique()`: Création d'un achat boutique
  - `mouvementerStock(achatId)`: Mouvemente le stock boutique

#### initialisationService.ts
- **Emplacement**: `src/services/initialisationService.ts`
- **Fonction**: Service pour l'initialisation comptable
- **Fonctions**:
  - `getInitialisationAccountsBundle(entrepriseId)`: Bundle de comptes pour initialisation
  - `getOpeningBalanceSummary()`: Résumé des soldes d'ouverture

#### inventaireService.ts
- **Emplacement**: `src/services/inventaireService.ts`
- **Fonction**: Service pour la gestion des inventaires

#### partnerReportService.ts
- **Emplacement**: `src/services/partnerReportService.ts`
- **Fonction**: Service pour les rapports partenaire

## 5. RAPPORTS MANAGER

### 5.1 Pages Rapports

#### Page rapports principale
- **Emplacement**: `src/app/(manager)/manager/rapports/page.tsx`

#### Rapports stocks
- **Emplacement**: `src/app/(manager)/manager/rapports/stocks/page.tsx`

#### Rapports commerciaux
- **Emplacement**: `src/app/(manager)/manager/rapports/commerciaux/page.tsx`

#### Rapports trésorerie
- **Emplacement**: `src/app/(manager)/manager/rapports/tresorerie/page.tsx`

#### Rapports créances/dettes
- **Emplacement**: `src/app/(manager)/manager/rapports/creances-dettes/page.tsx`

#### Rapports financiers
- **Emplacement**: `src/app/(manager)/manager/rapports/financiers/page.tsx`

#### Rapports balance
- **Emplacement**: `src/app/(manager)/manager/rapports/balance/page.tsx`

#### Rapports grand livre
- **Emplacement**: `src/app/(manager)/manager/rapports/grand-livre/page.tsx`

### 5.2 Composants Rapports

#### ManagerRapportsPage.tsx
- **Emplacement**: `src/components/manager/rapports/ManagerRapportsPage.tsx`
- **Fonction**: Page principale des rapports manager

## 6. PARAMÈTRES COMPTABILITÉ

### 6.1 Structure Comptes

#### StructureComptesPage.tsx
- **Emplacement**: `src/components/manager/parametres/StructureComptesPage.tsx`
- **Fonction**: Gestion de la structure des comptes
- **Emplacement page**: `src/app/(manager)/manager/parametres/comptes/page.tsx`

## 7. RAPPORTS PARTENAIRES

### 7.1 Rapports Partenaire

#### PartnerAchatsReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerAchatsReport.tsx`

#### PartnerRealisationsReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerRealisationsReport.tsx`

#### PartnerCaBoutiqueReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerCaBoutiqueReport.tsx`

#### PartnerDoleancesStatsReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerDoleancesStatsReport.tsx`

#### PartnerVolumesReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerVolumesReport.tsx`

#### PartnerStocksReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerStocksReport.tsx`

#### PartnerComparatifReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerComparatifReport.tsx`

#### PartnerEcartsCarburantReport.tsx
- **Emplacement**: `src/components/partner/reports/PartnerEcartsCarburantReport.tsx`

## 8. UTILITAIRES

### 8.1 Export

#### exportXls.ts
- **Emplacement**: `src/lib/exportXls.ts`
- **Fonction**: Utilitaires pour l'export Excel

#### exportCsv (dans lib/utils)
- **Fonction**: Export CSV des rapports

### 8.2 Print

#### printUtils.ts
- **Emplacement**: `src/lib/printUtils.ts`
- **Fonction**: Utilitaires pour l'impression

#### PrintButton.tsx
- **Emplacement**: `src/components/reports/PrintButton.tsx`
- **Fonction**: Bouton d'impression des rapports

## 9. RAPPORTS CARBURANT

### 9.1 Rapports Carburant

#### CmupReport.tsx
- **Emplacement**: `src/components/reports/carburant/CmupReport.tsx`
- **Fonction**: Rapport CMUP (Coût Moyen Unitaire Pondéré)

#### AchatsCarburantReport.tsx
- **Emplacement**: `src/components/reports/carburant/AchatsCarburantReport.tsx`
- **Fonction**: Rapport achats carburant

## SYNTHÈSE

### Points Forts
- ✅ Architecture modulaire avec composants réutilisables
- ✅ Partie double vérifiée avec PartieDoubleCheck (règle bloquante)
- ✅ Séparation claire entre écritures comptables et rapports
- ✅ Tests unitaires pour les composants critiques
- ✅ Export CSV pour tous les rapports
- ✅ Filtres par période et station
- ✅ Interface moderne avec shadcn/ui

### Architecture
- **Composants Core**: 3 composants (ComptabiliserAchatDialog, EcriturePreview, PartieDoubleCheck)
- **Rapports Financiers**: 3 rapports (Compte de résultat, Bilan, Situation 460)
- **Rapports Comptabilité**: 4 rapports (Balance, Grand Livre, Créances/Dettes, Trésorerie)
- **Opérations**: 8 dialogs pour opérations hors achat/vente
- **Services**: 5 services (comptes, achatBoutique, initialisation, inventaire, partnerReport)
- **Rapports Partenaire**: 8 rapports

### Total Fichiers Comptabilité
- Composants: 3
- Rapports: 15
- Dialogs opérations: 8
- Services: 5
- Pages: 15
- Tests: 2
- **Total**: ~48 fichiers
