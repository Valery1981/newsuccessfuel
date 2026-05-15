---
description: APEX 2026-05-15-06 — Intégrer guide/DIFF.md dans Dashboard Partenaire (KPIs enrichis, projections, TM filter, badge MAJ)
argument-hint: <aucun — lancer directement>
priority: 🟠 HAUTE
---

<objective>
Le fichier `guide/DIFF.md` (495L) documente les modifications client postérieures au Guide qui s'appliquent au dashboard partenaire et à ses rapports. Plusieurs éléments ne sont pas (ou partiellement) intégrés.

Cibles à intégrer :
1. **§1 — KPI cards** : achats carburant/produit MTD, ventes carburant/produit MTD, achat lubrifiants MTD, doléances ouvertes
2. **§2 — Stocks par station/produit avec seuil alerte** (rouge si stock ≤ seuil)
3. **§3 — Réalisation vs objectif mensuel + projection fin de mois** (vitesse journalière)
4. **§4 — Réalisation vs objectif annuel + projection annuelle**
5. **§5 — Niveau écarts par station avec tendance**
6. **§6-7 — Stats doléances par TM + Filtre TM global**
7. **§9 — Badge "dernière mise à jour" par station** (inventaire/shift/réception/doléance)
8. **§10 — RETIRER CA boutique du dashboard** (le déplacer en rapport dédié)
</objective>

<context>
Fichiers à analyser :
- guide/DIFF.md (lecture complète)
- src/components/partner/PartnerDashboardPage.tsx (580L — état actuel)
- src/components/partner/{KPICards, StockLevelTable, StationEcartTable, AnnualObjectiveTable, MonthlyObjectiveTable, DoleanceStats, StationFilter}.tsx (composants existants)
- src/services/{partnerKPIService, partnerStockService, partnerObjectiveService, partnerEcartService, partnerDoleanceService}.ts
- src/services/tmService.ts (Territory Managers)

Composants manquants (selon DIFF §12.1) :
- `RealisationObjectiveTable.tsx` — projection journalière mensuelle
- `AnnualRealisationTable.tsx` — projection annuelle
- `EcartLevelTable.tsx` — niveau écarts avec tendance
- `TMFilter.tsx` — filtre global Territory Manager
- `LastUpdateBadge.tsx` — date/heure dernière MAJ par station

Routes manquantes :
- /partner/rapports/ca-boutique (existe déjà 1 page mais à enrichir)
- /partner/rapports/stocks-station, /ecarts-station, /realisations-station
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire DIFF.md intégralement (495L)
2. Lire PartnerDashboardPage.tsx pour identifier ce qui existe vs manque
3. Lister les colonnes Supabase nécessaires (objectifs annuels, dates dernière MAJ)

## ÉTAPE 2 — PLAN
Composants à créer (5) + services à étendre (2) + retraits (1).

A. KPICards : ajouter 3 cards manquantes (achats carb/prod MTD, ventes carb/prod MTD, achat lubrifiants MTD)
B. RealisationObjectiveTable + AnnualRealisationTable (avec projection)
C. EcartLevelTable (tendance via comparaison N-1)
D. TMFilter global (réutilise tmService) + state remonté au PartnerDashboardPage
E. LastUpdateBadge (composant générique recevant une station_id)
F. Retirer CA boutique du dashboard, créer `/partner/rapports/ca-boutique` détaillé
G. Étendre `partnerObjectiveService` avec calcul projections journalières

## ÉTAPE 3 — EXECUTE
Ordre :
1. partnerKPIService : ajouter méthodes achats/ventes par produit MTD + lubrifiants
2. KPICards : intégrer nouveaux KPIs
3. RealisationObjectiveTable + AnnualRealisationTable
4. EcartLevelTable + tendance
5. TMFilter + state global
6. LastUpdateBadge + intégration dans StockLevelTable / StationEcartTable
7. Retirer CA boutique du dashboard
8. Enrichir /partner/rapports/ca-boutique

## ÉTAPE 4 — VALIDATE
- [ ] Dashboard affiche : 3 KPIs achats par produit + 4 KPIs ventes + 1 lubrifiant + doléances ouvertes
- [ ] StockLevelTable rouge si stock ≤ seuil + icône ⚠️
- [ ] Projection mensuelle et annuelle calculées correctement
- [ ] TMFilter filtre stations + doléances + KPIs
- [ ] LastUpdateBadge format JJ/MM/AAAA HH:MM
- [ ] CA boutique absent du dashboard, présent dans rapport dédié
- [ ] Tests unitaires : projections (vitesse journalière)
- [ ] Test E2E : changer TMFilter → données filtrées
</process>

<rules>
- Partenaire ne voit JAMAIS de données financières (CA carburant, marges, trésorerie)
- CA boutique présent dans rapports SANS marges (Guide §12)
- Volumes en litres uniquement (jamais valorisés)
- Performance ≤ 1s — utiliser TanStack Query staleTime 5min
- Code couleur cohérent : Vert ≥100%, Orange 80-99%, Rouge <80% (cf. DIFF §3)
</rules>
