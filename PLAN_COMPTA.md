# PLAN COMPTA - Comparaison ANCIEN vs NOUVEAU

> Date: 2026-05-05
> Objectif: Identifier les différences entre successfuel (ANCIEN) et src (NOUVEAU) pour décider ce qu'il faut garder/supprimer/modifier dans src

## LÉGENDE

- ✅ **GARDER**: Fonctionnalité présente dans NOUVEAU et à conserver
- ➕ **AJOUTER**: Fonctionnalité présente dans ANCIEN mais absente de NOUVEAU (à migrer)
- 🔄 **MODIFIER**: Fonctionnalité présente dans les deux mais avec implémentation différente (à améliorer)
- ❌ **SUPPRIMER**: Fonctionnalité obsolète ou remplacée
- 🤔 **ÉVALUER**: Fonctionnalité à évaluer pour pertinence

---

## 1. COMPOSANTS COMPTABILITÉ CORE

### 1.1 Vérification Partie Double

| Fonctionnalité                           | ANCIEN    | NOUVEAU                            | Décision                                            |
| ---------------------------------------- | --------- | ---------------------------------- | --------------------------------------------------- |
| PartieDoubleCheck (vérification ∑D = ∑C) | ❌ Absent | ✅ Présent (PartieDoubleCheck.tsx) | ✅ **GARDER** - Essentiel pour règle bloquante §6.1 |
| computeBalance (exportée pour tests)     | ❌ Absent | ✅ Présent (exportée)              | ✅ **GARDER** - Permet tests unitaires              |
| Tolérance arrondi (0.01)                 | ❌ Absent | ✅ Présent                         | ✅ **GARDER** - Standard comptable                  |

### 1.2 Aperçu Écritures

| Fonctionnalité                             | ANCIEN    | NOUVEAU                                    | Décision                                  |
| ------------------------------------------ | --------- | ------------------------------------------ | ----------------------------------------- |
| EcriturePreview (tableau D/C)              | ❌ Absent | ✅ Présent (EcriturePreview.tsx)           | ✅ **GARDER** - Essentiel pour validation |
| Affichage libellés uniquement (règle §6.1) | ❌ Absent | ✅ Présent                                 | ✅ **GARDER** - Conforme aux règles       |
| Affichage numéros comptes                  | ❌ Absent | ✅ Présent (exception Grand Livre/Balance) | ✅ **GARDER** - Conforme aux règles       |

### 1.3 Dialog Comptabilisation

| Fonctionnalité                                           | ANCIEN    | NOUVEAU                                   | Décision                               |
| -------------------------------------------------------- | --------- | ----------------------------------------- | -------------------------------------- |
| ComptabiliserAchatDialog                                 | ❌ Absent | ✅ Présent (ComptabiliserAchatDialog.tsx) | ✅ **GARDER** - Pattern réutilisable   |
| buildAchatLignes (exportée pour tests)                   | ❌ Absent | ✅ Présent                                | ✅ **GARDER** - Permet tests unitaires |
| Règle §6.1 (Débit Achats, Crédit Trésorerie/Fournisseur) | ❌ Absent | ✅ Présent                                | ✅ **GARDER** - Conforme aux règles    |

**RECOMMANDATION**: ✅ **CONSERVER TOUS LES COMPOSANTS CORE DE NOUVEAU** - Ils sont essentiels et absents de ANCIEN

---

## 2. RAPPORTS FINANCIERS

### 2.1 Compte de Résultat

| Fonctionnalité                                          | ANCIEN                                   | NOUVEAU                               | Décision                                   |
| ------------------------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| CompteResultatReport                                    | ❌ Absent (mais SimplifiedResult existe) | ✅ Présent (CompteResultatReport.tsx) | 🔄 **COMPARER** - Voir implémentations     |
| Affichage Charges (classe 6)                            | ✅ Présent (SimplifiedResult)            | ✅ Présent                            | 🔄 **COMPARER**                            |
| Affichage Produits (classe 7)                           | ✅ Présent (SimplifiedResult)            | ✅ Présent                            | 🔄 **COMPARER**                            |
| Résultat net (Produits - Charges)                       | ✅ Présent                               | ✅ Présent                            | 🔄 **COMPARER**                            |
| KPIs direction (CA, marge brute, VA, EBE, résultat net) | ✅ Présent (getIncomeStatementKpis)      | ❌ Absent                             | ➕ **AJOUTER** - Très utile pour direction |

**ANALYSE DÉTAILLÉE**:

- **NOUVEAU**: Utilise vue_grand_livre, filtre par comptes 6xx/7xx, affichage visuel simple
- **ANCIEN**: Service getSimplifiedResult avec agrégation métier (shifts, achats, charges), getIncomeStatementKpis pour KPIs direction

**RECOMMANDATION**: 🔄 **FUSIONNER** - Garder l'approche NOUVEAU (vue_grand_livre) mais AJOUTER les KPIs direction de ANCIEN

### 2.2 Bilan

| Fonctionnalité                                                           | ANCIEN                                     | NOUVEAU                      | Décision                                       |
| ------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------- | ---------------------------------------------- |
| BilanReport                                                              | ❌ Absent (mais FinancialSituation existe) | ✅ Présent (BilanReport.tsx) | 🔄 **COMPARER**                                |
| Classification automatique par section                                   | ❌ Absent                                  | ✅ Présent (classifyAccount) | ✅ **GARDER** - Très bien implémenté           |
| Vérification équilibre Actif = Passif                                    | ❌ Absent                                  | ✅ Présent                   | ✅ **GARDER** - Essentiel                      |
| Date de référence paramétrable                                           | ❌ Absent                                  | ✅ Présent                   | ✅ **GARDER** - Flexible                       |
| Sections: Immobilisations, Stocks, Créances, Trésorerie, Capital, Dettes | ✅ Présent (FinancialSituation)            | ✅ Présent                   | 🔄 **COMPARER**                                |
| Compte 108 (opérations durables gérant)                                  | ✅ Présent (géré dans getNetAsset)         | ❌ Absent                    | ➕ **GARDER** - Fonctionnalité métier critique |

**ANALYSE DÉTAILLÉE**:

- **NOUVEAU**: classifyAccount function élégante, vérification équilibre, affichage par section
- **ANCIEN**: FinancialSituation avec gestion compte 108, getNetAsset plus complet

**RECOMMANDATION**: 🔄 **FUSIONNER** - Garder classifyAccount de NOUVEAU mais AJOUTER la gestion compte 108 de ANCIEN

### 2.3 Actif Net / Situation Financière

| Fonctionnalité                                              | ANCIEN                             | NOUVEAU   | Décision                                 |
| ----------------------------------------------------------- | ---------------------------------- | --------- | ---------------------------------------- |
| Actif net (trésorerie + stocks + créances + immos - dettes) | ✅ Présent (getNetAsset)           | ❌ Absent | ➕ **AJOUTER** - Indicateur clé          |
| Situation financière (assets vs liabilities)                | ✅ Présent (getFinancialSituation) | ❌ Absent | ➕ **AJOUTER** - Vue synthétique         |
| Compte 108 (opérations durables gérant)                     | ✅ Présent                         | ❌ Absent | ➕ **AJOUTER** - Critique                |
| RPC: get_net_asset_components_at                            | ✅ Présent                         | ❌ Absent | ➕ **AJOUTER** - Calcul complexe backend |
| RPC: get_manager_capital_treasury_effect                    | ✅ Présent                         | ❌ Absent | ➕ **AJOUTER** - Gestion capital gérant  |

**RECOMMANDATION**: ➕ **AJOUTER** - Les fonctionnalités d'ANCIEN sont plus avancées et métier-critiques

### 2.4 Flux de Trésorerie

| Fonctionnalité               | ANCIEN                   | NOUVEAU   | Décision                                    |
| ---------------------------- | ------------------------ | --------- | ------------------------------------------- |
| CashFlowReport               | ✅ Présent (getCashFlow) | ❌ Absent | ➕ **AJOUTER** - Indicateur cash management |
| Entrées (débits trésorerie)  | ✅ Présent               | ❌ Absent | ➕ **AJOUTER**                              |
| Sorties (crédits trésorerie) | ✅ Présent               | ❌ Absent | ➕ **AJOUTER**                              |
| Flux net                     | ✅ Présent               | ❌ Absent | ➕ **AJOUTER**                              |

**RECOMMANDATION**: ➕ **AJOUTER** - Indicateur essentiel pour cash management

### 2.5 Résultat Simplifié

| Fonctionnalité                                        | ANCIEN     | NOUVEAU   | Décision                                  |
| ----------------------------------------------------- | ---------- | --------- | ----------------------------------------- |
| SimplifiedResult (opérationnel, sans variation stock) | ✅ Présent | ❌ Absent | ➕ **AJOUTER** - Vue opérationnelle utile |
| Ventes carburant (shifts)                             | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |
| Ventes boutique (shifts)                              | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |
| Services                                              | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |
| Achats boutique                                       | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |
| BC carburant (date commande)                          | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |
| Charges enregistrées                                  | ✅ Présent | ❌ Absent | ➕ **AJOUTER**                            |

**RECOMMANDATION**: ➕ **AJOUTER** - Vue opérationnelle différente du compte de résultat comptable

### 2.6 Situation 460

| Fonctionnalité     | ANCIEN    | NOUVEAU                             | Décision                               |
| ------------------ | --------- | ----------------------------------- | -------------------------------------- |
| Situation460Report | ❌ Absent | ✅ Présent (Situation460Report.tsx) | ✅ **GARDER** - Spécifique SuccessFuel |

---

## 3. RAPPORTS COMPTABILITÉ

### 3.1 Balance

| Fonctionnalité              | ANCIEN                                   | NOUVEAU                               | Décision                                         |
| --------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| BalanceReport               | ✅ Présent (reportDefinitions.ts - mock) | ✅ Présent (BalanceReport.tsx - réel) | 🔄 **CONSERVER NOUVEAU** - Implémentation réelle |
| Filtre par période          | ✅ Présent                               | ✅ Présent                            | ✅ **GARDER**                                    |
| Filtre par station          | ✅ Présent                               | ✅ Présent                            | ✅ **GARDER**                                    |
| Soldes débiteurs/créditeurs | ✅ Présent                               | ✅ Présent                            | ✅ **GARDER**                                    |
| Totaux globaux              | ✅ Présent                               | ✅ Présent                            | ✅ **GARDER**                                    |
| Export CSV                  | ✅ Présent                               | ✅ Présent                            | ✅ **GARDER**                                    |

**RECOMMANDATION**: ✅ **CONSERVER NOUVEAU** - Implémentation réelle avec vue_grand_livre

### 3.2 Grand Livre

| Fonctionnalité                                     | ANCIEN                                   | NOUVEAU                                  | Décision                                         |
| -------------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| GrandLivreReport                                   | ✅ Présent (reportDefinitions.ts - mock) | ✅ Présent (GrandLivreReport.tsx - réel) | 🔄 **CONSERVER NOUVEAU** - Implémentation réelle |
| Filtre par période                                 | ✅ Présent                               | ✅ Présent                               | ✅ **GARDER**                                    |
| Filtre par station                                 | ✅ Présent                               | ✅ Présent                               | ✅ **GARDER**                                    |
| Filtre par compte (N°)                             | ❌ Absent                                | ✅ Présent                               | ✅ **GARDER** - Fonctionnalité utile             |
| Affichage date, pièce, compte, libellé, tiers, D/C | ✅ Présent                               | ✅ Présent                               | ✅ **GARDER**                                    |
| Limit 500 écritures                                | ❌ Absent                                | ✅ Présent                               | ✅ **GARDER** - Performance                      |
| Export CSV                                         | ✅ Présent                               | ✅ Présent                               | ✅ **GARDER**                                    |

**RECOMMANDATION**: ✅ **CONSERVER NOUVEAU** - Implémentation réelle avec filtre compte supplémentaire

### 3.3 Créances / Dettes

| Fonctionnalité       | ANCIEN    | NOUVEAU                               | Décision      |
| -------------------- | --------- | ------------------------------------- | ------------- |
| CreancesDettesReport | ❌ Absent | ✅ Présent (CreancesDettesReport.tsx) | ✅ **GARDER** |

### 3.4 Trésorerie

| Fonctionnalité   | ANCIEN    | NOUVEAU                           | Décision      |
| ---------------- | --------- | --------------------------------- | ------------- |
| TresorerieReport | ❌ Absent | ✅ Présent (TresorerieReport.tsx) | ✅ **GARDER** |

---

## 4. OPÉRATIONS HORS VENTE

### 4.1 Structure

| Fonctionnalité                                         | ANCIEN                                      | NOUVEAU                                     | Décision                      |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------- | ----------------------------- |
| Page principale opérations                             | ✅ Présent (ManagerNonSalesOperationsPage)  | ✅ Présent (ManagerNonSalesOperationsPage)  | 🔄 **COMPARER**               |
| 8 dialogs opérations                                   | ✅ Présent (structure tabs)                 | ✅ Présent (dialogs directs)                | 🔄 **COMPARER**               |
| Salaires                                               | ✅ Présent (Salaires/)                      | ✅ Présent (SalairesDialog.tsx)             | 🔄 **COMPARER**               |
| Charges courantes                                      | ✅ Présent (ChargesCourantes/)              | ✅ Présent (ChargesCourantesDialog.tsx)     | 🔄 **COMPARER**               |
| Charges fiscales                                       | ✅ Présent (via tabs)                       | ✅ Présent (route dédiée)                   | 🔄 **COMPARER**               |
| Encaissement créances                                  | ✅ Présent (Creances/)                      | ✅ Présent (EncaissementCreancesDialog.tsx) | 🔄 **COMPARER**               |
| Réglement dettes                                       | ✅ Présent (Fournisseurs/)                  | ✅ Présent (ReglementDettesDialog.tsx)      | 🔄 **COMPARER**               |
| Immobilisations                                        | ✅ Présent (Immobilisations/)               | ✅ Présent (ImmobilisationsDialog.tsx)      | 🔄 **COMPARER**               |
| Virement interne                                       | ✅ Présent (VirementInterne/)               | ✅ Présent (route dédiée)                   | 🔄 **COMPARER**               |
| Opérations gérant                                      | ✅ Présent (Gerant/GerantOperationsTab.tsx) | ✅ Présent (OperationsGerantDialog.tsx)     | 🔄 **COMPARER**               |
| Composants partagés (OperationAlert, OperationTooltip) | ✅ Présent (shared/)                        | ❌ Absent                                   | ➕ **AJOUTER** - UX améliorée |

**ANALYSE DÉTAILLÉE**:

- **NOUVEAU**: Dialogs directs, routes dédiées, moins de structure de dossiers
- **ANCIEN**: Structure par tabs, dossiers séparés, composants partagés

**RECOMMANDATION**: 🔄 **FUSIONNER** - Garder l'approche NOUVEAU (dialogs directs) mais AJOUTER les composants partagés de ANCIEN (OperationAlert, OperationTooltip)

---

## 5. SERVICES

### 5.1 Services Financiers

| Fonctionnalité                           | ANCIEN                  | NOUVEAU   | Décision                                |
| ---------------------------------------- | ----------------------- | --------- | --------------------------------------- |
| financialReportService                   | ✅ Présent (764 lignes) | ❌ Absent | ➕ **AJOUTER** - Très complet           |
| getNetAsset                              | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Essentiel              |
| getFinancialSituation                    | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Essentiel              |
| getCashFlow                              | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Essentiel              |
| getSimplifiedResult                      | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Utile                  |
| getIncomeStatementKpis                   | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - KPIs direction         |
| RPC: get_trial_balance                   | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Backend complexe       |
| RPC: get_manager_capital_treasury_effect | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Gestion capital        |
| RPC: get_net_asset_components_at         | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Calcul stocks/créances |
| Agrégation par familles (61-76)          | ✅ Présent              | ❌ Absent | ➕ **AJOUTER** - Compte résultat        |

**RECOMMANDATION**: ➕ **MIGRER financialReportService COMPLET** - C'est le service le plus avancé

### 5.2 Services Opérations

| Fonctionnalité           | ANCIEN                    | NOUVEAU    | Décision        |
| ------------------------ | ------------------------- | ---------- | --------------- |
| comptesService           | ❌ Absent                 | ✅ Présent | ✅ **GARDER**   |
| achatBoutiqueService     | ✅ Présent (probablement) | ✅ Présent | 🔄 **COMPARER** |
| initialisationService    | ✅ Présent (probablement) | ✅ Présent | 🔄 **COMPARER** |
| inventaireService        | ✅ Présent (probablement) | ✅ Présent | 🔄 **COMPARER** |
| partnerReportService     | ❌ Absent                 | ✅ Présent | ✅ **GARDER**   |
| managerOperationsService | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |
| manualOperationsService  | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |
| salaryOperationsService  | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |
| commercialReportService  | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |
| stockReportService       | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |
| grandLivreReportService  | ✅ Présent                | ❌ Absent  | ➕ **AJOUTER**  |

**RECOMMANDATION**: 🔄 **COMPARER** services existants et AJOUTER services manquants de ANCIEN

---

## 6. RAPPORTS PARTENAIRES

| Fonctionnalité               | ANCIEN    | NOUVEAU    | Décision      |
| ---------------------------- | --------- | ---------- | ------------- |
| PartnerAchatsReport          | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerRealisationsReport    | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerCaBoutiqueReport      | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerDoleancesStatsReport  | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerVolumesReport         | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerStocksReport          | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerComparatifReport      | ❌ Absent | ✅ Présent | ✅ **GARDER** |
| PartnerEcartsCarburantReport | ❌ Absent | ✅ Présent | ✅ **GARDER** |

**RECOMMANDATION**: ✅ **CONSERVER TOUS** - Absents de ANCIEN, bien implémentés dans NOUVEAU

---

## 7. ARCHITECTURE RAPPORTS

### 7.1 Structure

| Aspect                    | ANCIEN                            | NOUVEAU    | Décision                                          |
| ------------------------- | --------------------------------- | ---------- | ------------------------------------------------- |
| Architecture hub-based    | ✅ Présent (ReportsHub)           | ❌ Absent  | 🤔 **ÉVALUER** - Hub centralisé vs pages directes |
| Métadonnées centralisées  | ✅ Présent (reportDefinitions.ts) | ❌ Absent  | 🤔 **ÉVALUER** - Mock data vs real data           |
| Routes dynamiques         | ✅ Présent ($reportSlug)          | ❌ Absent  | 🤔 **ÉVALUER** - Flexibilité vs simplicité        |
| Pages directes            | ❌ Absent                         | ✅ Présent | ✅ **GARDER** - Plus simple Next.js               |
| ReportLayout réutilisable | ✅ Présent                        | ✅ Présent | ✅ **GARDER**                                     |

**RECOMMANDATION**: 🤔 **ÉVALUER** - L'approche NOUVEAU (pages directes) est plus simple et adaptée à Next.js 16, mais les métadonnées centralisées de ANCIEN pourraient être utiles pour génération dynamique

---

## 8. TESTS

| Aspect                       | ANCIEN    | NOUVEAU                                                             | Décision      |
| ---------------------------- | --------- | ------------------------------------------------------------------- | ------------- |
| Tests unitaires comptabilité | ❌ Absent | ✅ Présent (ComptabiliserAchatDialog.test.ts, dialogLignes.test.ts) | ✅ **GARDER** |
| buildAchatLignes testable    | ❌ Absent | ✅ Présent (exportée)                                               | ✅ **GARDER** |
| computeBalance testable      | ❌ Absent | ✅ Présent (exportée)                                               | ✅ **GARDER** |

**RECOMMANDATION**: ✅ **CONSERVER TOUS** - Tests absents de ANCIEN

---

## 9. DOCUMENTATION

| Aspect                              | ANCIEN                                                        | NOUVEAU   | Décision                    |
| ----------------------------------- | ------------------------------------------------------------- | --------- | --------------------------- |
| Documentation comptabilité complète | ✅ Présent (8 fichiers md/txt)                                | ❌ Absent | ➕ **AJOUTER** - Très utile |
| Principes comptabilité              | ✅ Présent (COMPTABILITE_PRINCIPE_SUCCESSFUEL.txt)            | ❌ Absent | ➕ **AJOUTER**              |
| Audit moteur comptabilité           | ✅ Présent (SUCCESSFUEL_ACCOUNTING_AND_STOCK_ENGINE_AUDIT.md) | ❌ Absent | ➕ **AJOUTER**              |
| Audit Supabase                      | ✅ Présent (AUDIT_SUPABASE_SUCCESSFUEL.md)                    | ❌ Absent | ➕ **AJOUTER**              |

**RECOMMANDATION**: ➕ **MIGRER DOCUMENTATION** - Très utile pour compréhension et maintenance

---

## SYNTHÈSE DES DÉCISIONS

### À GARDER de NOUVEAU ✅

1. **Composants Core**: PartieDoubleCheck, EcriturePreview, ComptabiliserAchatDialog
2. **Rapports Comptabilité**: BalanceReport, GrandLivreReport (implémentation réelle)
3. **Rapports Partenaires**: Tous les 8 rapports
4. **Services**: comptesService, partnerReportService
5. **Tests**: Tous les tests unitaires
6. **Architecture**: Pages directes Next.js 16

### À AJOUTER de ANCIEN ➕

1. **Services Financiers**: financialReportService complet (getNetAsset, getFinancialSituation, getCashFlow, getSimplifiedResult, getIncomeStatementKpis)
2. **RPC Supabase**: get_trial_balance, get_manager_capital_treasury_effect, get_net_asset_components_at
3. **Rapports**: Cash flow, Actif net, Situation financière, Résultat simplifié
4. **KPIs Direction**: CA, marge brute, VA, EBE, résultat net
5. **Compte 108**: Gestion opérations durables gérant
6. **Services Opérations**: managerOperationsService, manualOperationsService, salaryOperationsService
7. **Composants partagés**: OperationAlert, OperationTooltip
8. **Documentation**: Toute la documentation comptabilité

### À MODIFIER/FUSIONNER 🔄

1. **Compte de Résultat**: Garder NOUVEAU mais AJOUTER KPIs direction de ANCIEN
2. **Bilan**: Garder classifyAccount de NOUVEAU mais AJOUTER gestion compte 108 de ANCIEN
3. **Opérations**: Garder dialogs NOUVEAU mais AJOUTER composants partagés de ANCIEN

### À ÉVALUER 🤔

1. **Architecture Rapports**: Hub-based (ANCIEN) vs pages directes (NOUVEAU)
2. **Métadonnées centralisées**: reportDefinitions.ts (ANCIEN) vs implémentation directe (NOUVEAU)

### À SUPPRIMER ❌

- Rien à supprimer de NOUVEAU (tout est pertinent)
- Mock data de ANCIEN (reportDefinitions.ts) - remplacé par implémentation réelle dans NOUVEAU

---

## PLAN D'ACTION PRIORITAIRE

### Phase 1: Migration Services Financiers (HAUTE PRIORITÉ)

1. Copier `financialReportService.ts` de ANCIEN vers NOUVEAU
2. Adapter pour Next.js 16 (remplacer TanStack Router par Next.js App Router)
3. Créer pages pour: Actif net, Situation financière, Cash flow, Résultat simplifié
4. Intégrer KPIs direction dans Compte de résultat

### Phase 2: Architecture Comptabilité (HAUTE PRIORITÉ)

1. Intégrer gestion compte 108 dans BilanReport
2. Ajouter RPC Supabase nécessaires
3. Fusionner Compte de résultat avec KPIs direction
4. Ajouter composants partagés (OperationAlert, OperationTooltip)

### Phase 3: Services Opérations (MOYENNE PRIORITÉ)

1. Comparer services existants (achatBoutique, initialisation, inventaire)
2. Ajouter services manquants (managerOperations, manualOperations, salaryOperations)
3. Standardiser les interfaces

### Phase 4: Documentation (MOYENNE PRIORITÉ)

1. Migrer documentation comptabilité vers guide/
2. Créer documentation pour nouveaux services
3. Mettre à jour guides avec nouvelles fonctionnalités

### Phase 5: Tests (BASSE PRIORITÉ)

1. Ajouter tests pour nouveaux services
2. Couvrir getNetAsset, getFinancialSituation, etc.
3. Tests E2E pour nouveaux rapports

---

## CONCLUSION

**NOUVEAU (src)** a une meilleure architecture de base (Next.js 16, composants core, tests) mais manque des fonctionnalités métier avancées de **ANCIEN (successfuel)**.

**ANCIEN** a des services financiers très sophistiqués (financialReportService avec RPC Supabase, compte 108, KPIs direction) mais une architecture moins moderne (React + Vite vs Next.js 16).

**RECOMMANDATION GLOBALE**: Conserver l'architecture NOUVEAU et migrer les fonctionnalités métier avancées de ANCIEN, en priorité:

1. financialReportService complet
2. Gestion compte 108
3. KPIs direction
4. RPC Supabase pour calculs complexes
