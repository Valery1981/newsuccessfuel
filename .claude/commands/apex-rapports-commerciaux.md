---
description: APEX — Implémenter les rapports commerciaux manquants (CA produit, CA pompiste, Comparatif N-1, Réalisations objectifs, Top articles, Marge brute, Situation créances)
argument-hint: <aucun — lancer directement>
---

<objective>
Le dossier src/components/reports/commercial/ est VIDE.
Implémenter les 7 rapports commerciaux manquants selon le §13 du Guide Document SuccessFuel.
Ces rapports concernent le gérant uniquement. Ils doivent être imprimables PDF et exportables CSV/Excel.
Les routes /manager/rapports/[slug] existent déjà (14 routes créées) — vérifier lesquelles manquent et en ajouter si nécessaire.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §13 "RAPPORTS — Rapports Commerciaux & Ventes"
- src/components/reports/ReportLayout.tsx (layout standard existant)
- src/components/reports/ReportFilters.tsx (filtres période/station existants)
- src/components/reports/ventes/ (VentesCarburantReport.tsx, VentesBoutiqueReport.tsx, CaJournalierReport.tsx, BilanShiftsReport.tsx — exemples à suivre)
- src/app/(manager)/manager/rapports/ (routes existantes — identifier lesquelles manquent)
- src/components/manager/rapports/ManagerRapportsPage.tsx (hub de navigation — à mettre à jour)
- src/services/ (services existants à réutiliser)
- src/lib/utils.ts (formatCurrency, formatDate, exportCsv)

Rapports commerciaux à créer :
1. CA par produit/famille/catégorie — groupBy famille/catégorie/article, période + station
2. CA par pompiste/vendeuse/shift — groupBy employé, période + station
3. Comparatif N vs N-1 — même période, année courante vs année précédente, delta %
4. Réalisations vs Objectifs — volume carburant (litres) + CA boutique vs objectifs paramétrés
5. Top articles vendus / moins vendus — classement par CA ou quantité, filtre famille
6. Marge brute par produit/station — CA - CAMV, % marge, trend
7. Situation créances clients en cours — liste 411-xxx avec solde, échéance, statut couleur
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire les 4 rapports ventes existants pour comprendre le pattern exact (structure, hooks, queries)
2. Lire ReportLayout.tsx et ReportFilters.tsx pour comprendre les props attendues
3. Inspecter src/app/(manager)/manager/rapports/ pour lister les routes existantes
4. Vérifier src/components/manager/rapports/ManagerRapportsPage.tsx pour comprendre le hub de navigation
5. Identifier dans src/types/supabase.ts les tables nécessaires (shifts_carburant, tickets_boutique, lignes_ticket, objectifs, ecritures_comptables)

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/reports/commercial/
├── CaProduitReport.tsx          # CA par produit/famille/catégorie
├── CaPompisteReport.tsx         # CA par pompiste/vendeuse/shift
├── ComparatifNReport.tsx        # Comparatif N vs N-1
├── RealisationsObjectifsReport.tsx  # Réalisations vs Objectifs (volume + CA)
├── TopArticlesReport.tsx        # Top articles vendus/moins vendus
├── MargeBruteReport.tsx         # Marge brute par produit/station
└── SituationCreancesReport.tsx  # Créances clients en cours
```

Routes à créer si manquantes :
```
src/app/(manager)/manager/rapports/
├── ca-produit/page.tsx
├── ca-pompiste/page.tsx
├── comparatif-n/page.tsx
├── realisations-objectifs/page.tsx
├── top-articles/page.tsx
├── marge-brute/page.tsx
└── creances-clients/page.tsx
```

Mettre à jour :
- src/components/manager/rapports/ManagerRapportsPage.tsx — ajouter entrées dans le hub

## ÉTAPE 3 — EXECUTE
Pattern à suivre pour chaque rapport (basé sur ventes/CaJournalierReport.tsx) :
1. Props : stationId?, dateDebut, dateFin
2. useQuery avec clé unique et service Supabase
3. ReportLayout wrapping, ReportFilters, export CSV
4. Table shadcn/ui avec colonnes + totaux
5. Pour Comparatif N-1 : deux colonnes côte à côte + delta coloré (vert/rouge)
6. Pour Réalisations vs Objectifs : barre de progression % + couleur objectif atteint/non

Ordre d'implémentation :
1. SituationCreancesReport.tsx (le plus isolé — données 411-xxx)
2. CaProduitReport.tsx (groupBy famille)
3. CaPompisteReport.tsx (groupBy employé/shift)
4. TopArticlesReport.tsx (classement)
5. MargeBruteReport.tsx (CA - CMUP × quantité)
6. ComparatifNReport.tsx (double requête N et N-1)
7. RealisationsObjectifsReport.tsx (join avec table objectifs)
8. Créer les routes page.tsx pour chacun
9. Mettre à jour ManagerRapportsPage.tsx

## ÉTAPE 4 — VALIDATE
- [ ] Chaque rapport s'affiche avec données réelles (pas de mock en production)
- [ ] Filtres période + station fonctionnels
- [ ] Export CSV génère un fichier valide
- [ ] Totaux corrects en bas de chaque tableau
- [ ] Comparatif N-1 : delta en % avec couleur (vert = amélioration, rouge = baisse)
- [ ] Réalisations vs Objectifs : % correct (réalisé / objectif × 100)
- [ ] Marge brute = CA - (CMUP × quantité vendue) pour chaque article
- [ ] Situation créances triée par échéance, codes couleur corrects
- [ ] Hub ManagerRapportsPage.tsx affiche les nouveaux liens
- [ ] TypeScript strict 0 erreur
- [ ] Build npm run build réussit
</process>

<rules>
- Suivre EXACTEMENT le pattern de src/components/reports/ventes/CaJournalierReport.tsx
- Utiliser ReportLayout et ReportFilters sans les modifier
- Tous les montants formatés avec formatCurrency()
- Toutes les dates formatées avec formatDate()
- Jamais de numéros de comptes dans l'UI
- Tous les textes en FRANÇAIS
- Export CSV avec en-têtes en français
- Responsive : tables avec scroll horizontal sur mobile
- Skeleton pendant le chargement
</rules>
