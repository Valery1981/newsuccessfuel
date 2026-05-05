---
description: APEX — Implémenter les rapports financiers manquants (Bilan, Compte de résultat, Balance âgée fournisseurs/clients, Situation 460 par employé)
argument-hint: <aucun — lancer directement>
---

<objective>
Le dossier src/components/reports/financial/ est VIDE.
Les rapports GrandLivre, Balance, Trésorerie et Créances/Dettes existent déjà dans src/components/reports/comptabilite/.
Implémenter les 5 rapports financiers manquants selon le §13 du Guide Document SuccessFuel.
Ces rapports sont EXCLUSIFS au gérant (jamais visibles par le partenaire).
Accès restreint aux gérants uniquement — vérifier via useAuthStore().
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §13 "Rapports Financiers & Comptables"
- guide/Guide_Document_SuccessFuel.md §8.1 "Plan Comptable" (numéros de comptes précis)
- src/components/reports/comptabilite/ (GrandLivreReport.tsx, BalanceReport.tsx — modèles existants)
- src/components/reports/ReportLayout.tsx et ReportFilters.tsx
- src/types/supabase.ts (ecritures_comptables, lignes_ecriture, comptes_comptables, tiers)
- src/app/(manager)/manager/rapports/ (routes existantes)

Rapports à créer :
1. Bilan à une date donnée :
   - ACTIF : Classe 2 (Immobilisations) + Classe 3 (Stocks) + Classe 4 débiteurs (411, 460) + Classe 5 (Trésorerie)
   - PASSIF : Classe 1 (Capitaux : 101+120) + Classe 4 créditeurs (401, 431, 432, 444, 447, 4454) + Dettes LT (161)
   - Total Actif = Total Passif (équilibre obligatoire)
   - Calcule automatiquement : 101 (Capital) + 120 (Résultat net YTD) = Capitaux propres nets

2. Compte de résultat (global ou par station analytique) :
   - CHARGES : Classe 6 (603-CAMV, 640-Salaires, 611-Locations, etc.)
   - PRODUITS : Classe 7 (707x-Ventes, 706x-Services)
   - Résultat net = Total Produits - Total Charges → alimente compte 120
   - Filtrable par station (analytique) ou global entreprise

3. Balance âgée fournisseurs :
   - Liste 401-xxx avec solde, ventilation par tranche (<30j, 30-60j, 60-90j, >90j)
   - Tri par montant décroissant
   - Partenaire carburant séparé (solde global sur tout type)

4. Balance âgée clients :
   - Liste 411-xxx avec solde, ventilation par tranche
   - Crédit autorisé flag
   - Couleurs : Rouge (dépassé), Orange (<7j), Vert (normal)

5. Situation comptes 460 par employé :
   - Solde de chaque compte 460-xxx (Responsabilité Opérationnelle)
   - Détail : manquants shifts carburant + manquants boutique
   - Lien vers shifts/tickets concernés
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire GrandLivreReport.tsx et BalanceReport.tsx pour comprendre exactement comment les écritures comptables sont agrégées
2. Identifier dans supabase.ts les champs analytiques (station_id sur lignes_ecriture ou ecritures_comptables)
3. Vérifier comment les comptes 120 (Résultat net) est calculé dans le dashboard
4. Analyser la structure des tiers dans src/services/tiersService.ts (fournisseurs, clients, employés)
5. Identifier quelles routes rapports existent déjà vs lesquelles il faut créer

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/reports/financial/
├── BilanReport.tsx                  # Bilan actif/passif à date
├── CompteResultatReport.tsx         # Compte de résultat global ou par station
├── BalanceAgeesFournisseursReport.tsx  # Balance âgée fournisseurs 401-xxx
├── BalanceAgeesClientsReport.tsx    # Balance âgée clients 411-xxx
└── Situation460Report.tsx           # Situation comptes 460 par employé
```

Routes à créer :
```
src/app/(manager)/manager/rapports/
├── bilan/page.tsx
├── compte-resultat/page.tsx
├── balance-fournisseurs/page.tsx
├── balance-clients/page.tsx
└── situation-460/page.tsx
```

Mettre à jour :
- src/components/manager/rapports/ManagerRapportsPage.tsx — section "Rapports Financiers & Comptables"

## ÉTAPE 3 — EXECUTE
Ordre d'implémentation :
1. Situation460Report.tsx — le plus simple (query directe sur lignes_ecriture compte 460-xxx)
2. BalanceAgeesClientsReport.tsx — liste 411-xxx avec calcul tranches d'âge
3. BalanceAgeesFournisseursReport.tsx — liste 401-xxx avec tranches d'âge
4. CompteResultatReport.tsx — agrégation classes 6 et 7 (avec analytique station)
5. BilanReport.tsx — agrégation par classe (le plus complexe, vérifier équilibre)
6. Créer les routes page.tsx
7. Mettre à jour ManagerRapportsPage.tsx

Logique Bilan :
```typescript
// Actif = Passif obligatoirement
const actif = immobilisations + stocks + creancesClients + creancesEmployes + tresorerie
const passif = capitaux + dettesFournisseurs + dettesFiscalesSociales + empruntsLT
// Si actif !== passif → afficher alerte "Bilan déséquilibré"
```

Logique Compte de résultat :
```typescript
// Query sur lignes_ecriture avec JOIN comptes_comptables WHERE numero LIKE '6%' OR '7%'
// GROUP BY compte, station_id (si analytique demandé)
const resultatNet = totalProduits - totalCharges
```

Tranches âge créances/dettes :
```typescript
const aujourdhui = new Date()
const tranche = (echeance: Date) => {
  const jours = differenceInDays(aujourdhui, echeance)
  if (jours > 0) return 'depasse'       // Rouge
  if (jours > -7) return 'urgent'       // Orange
  return 'normal'                        // Vert
}
```

## ÉTAPE 4 — VALIDATE
- [ ] Bilan : Total Actif = Total Passif (afficher alerte si déséquilibré)
- [ ] Compte de résultat : Résultat net = cohérent avec solde compte 120 en Grand Livre
- [ ] Balance âgée : tranches d'âge correctes avec codes couleur
- [ ] Situation 460 : chaque employé a son propre solde
- [ ] Filtres date fonctionnels sur tous les rapports
- [ ] Filtre station sur Compte de résultat (analytique)
- [ ] Export CSV avec en-têtes corrects
- [ ] Accès restreint gérant uniquement (vérifier role dans page.tsx)
- [ ] TypeScript strict 0 erreur
</process>

<rules>
- Numéros de comptes INVISIBLES en frontend (afficher libellé seulement)
- Exception : Grand Livre et Balance peuvent afficher les numéros en option — mais PAS les nouveaux rapports financiers
- Logique métier EXCLUSIVEMENT via les DB functions (calculer_cmup, verifier_partie_double)
- Le Bilan doit TOUJOURS afficher la date de référence en en-tête
- Tous les montants en Ariary avec formatCurrency()
- Le Compte de résultat doit distinguer résultat positif (bénéfice vert) vs négatif (perte rouge)
- Ces rapports sont CONFIDENTIELS — jamais accessibles aux partenaires ni collaborateurs non autorisés
</rules>
