---
description: APEX — Implémenter les rapports partenaire (données opérationnelles uniquement — volumes, stocks, objectifs, doléances — jamais de données financières)
argument-hint: <aucun — lancer directement>
---

<objective>
Le partenaire officiel n'a PAS de page rapports dédiée dans l'app actuelle.
Selon §12 du Guide Document, le partenaire a accès à des "Rapports (données opérationnelles uniquement — jamais financières)" via son interface.
RÈGLE CRITIQUE : Le partenaire NE VOIT JAMAIS : CA carburant, marges, trésorerie, comptabilité, salaires, charges.
Le partenaire VOIT : volumes vendus (carburant), stocks, achats, réalisations vs objectifs, écarts stocks carburant, CA boutique (sans marges).
Les routes /partner/rapports/* n'existent pas encore.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §12 "INTERFACE PARTENAIRE — Rapports"
- guide/Guide_Document_SuccessFuel.md §2 "Partenaire Officiel" (liste précise de ce qu'il voit et ne voit PAS)
- src/components/partner/ (PartnerDashboardPage.tsx, PartnerStationsPage.tsx — modèles)
- src/app/(partner)/partner/ (routes existantes)
- src/app/(partner)/layout.tsx (sidebar partenaire)
- src/services/partnerService.ts (queries partenaire existantes)
- src/components/reports/ReportLayout.tsx et ReportFilters.tsx (layout standard)

Rapports partenaire à créer (OPÉRATIONNELS UNIQUEMENT) :
1. Volumes vendus réseau — litres vendus par station et par produit, période
2. Stocks carburant réseau — niveau stocks par cuve et par station
3. Achats carburant réseau — volumes achetés/livrés par station, écarts livraison
4. Écarts carburant réseau — récap des inventaires et écarts (pas les valorisations)
5. Réalisations vs Objectifs réseau — volume carburant (litres) + CA boutique vs objectifs
6. CA boutique réseau — CA boutique uniquement (SANS marges, SANS coût)
7. Comparatif inter-stations — ranking performance par station (volumes + CA boutique)
8. Statistiques doléances — délais moyens par TM, types incidents, taux résolution
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire PartnerDashboardPage.tsx pour comprendre les données déjà disponibles
2. Lire partnerService.ts pour comprendre les queries existantes et RLS appliqué
3. Vérifier PartnerStationsPage.tsx — quelles données sont affichées (confirmation pas de financier)
4. Analyser les rapports gérant existants pour identifier lesquels peuvent être adaptés (volumes, stocks)
5. Vérifier le layout partenaire pour confirmer où insérer le lien "Rapports"

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/partner/reports/
├── PartnerVolumesReport.tsx          # Volumes vendus réseau
├── PartnerStocksReport.tsx           # Stocks carburant réseau
├── PartnerAchatsReport.tsx           # Achats et écarts livraison réseau
├── PartnerEcartsCarburantReport.tsx  # Écarts inventaire réseau
├── PartnerRealisationsReport.tsx     # Réalisations vs Objectifs réseau
├── PartnerCaBoutiqueReport.tsx       # CA boutique réseau (sans marges)
├── PartnerComparatifReport.tsx       # Comparatif inter-stations
└── PartnerDoleancesStatsReport.tsx   # Statistiques doléances

src/app/(partner)/partner/rapports/
├── page.tsx                          # Hub rapports partenaire
├── volumes/page.tsx
├── stocks/page.tsx
├── achats/page.tsx
├── ecarts-carburant/page.tsx
├── realisations/page.tsx
├── ca-boutique/page.tsx
├── comparatif-stations/page.tsx
└── stats-doleances/page.tsx
```

Modifier :
- src/app/(partner)/layout.tsx — ajouter "Rapports" dans la sidebar

## ÉTAPE 3 — EXECUTE
Sécurité en premier — créer des services sécurisés :
```typescript
// partnerReportService.ts — JAMAIS de queries sur ecritures_comptables, marges, trésorerie
// Uniquement : mouvements_stock, shifts_carburant (volumes seulement), tickets_boutique (CA seulement)
// RLS Supabase garantit l'isolation partenaire — mais filtrer aussi côté service
```

Ordre d'implémentation :
1. Hub page /partner/rapports/page.tsx (navigation)
2. PartnerVolumesReport.tsx (query shifts_carburant — volumes uniquement, pas de CA carburant)
3. PartnerStocksReport.tsx (query stocks_carburant courants)
4. PartnerEcartsCarburantReport.tsx (query inventaires carburant)
5. PartnerCaBoutiqueReport.tsx (CA boutique SANS marges)
6. PartnerRealisationsReport.tsx (join objectifs — uniquement volume litres + CA boutique)
7. PartnerAchatsReport.tsx (query achats_carburant volumes uniquement)
8. PartnerComparatifReport.tsx (ranking stations)
9. PartnerDoleancesStatsReport.tsx (stats depuis doleances)
10. Ajouter "Rapports" dans sidebar layout partenaire

Guard de sécurité à ajouter dans chaque rapport :
```typescript
// VÉRIFICATION : s'assurer que AUCUN champ financier n'est exposé
// Champs INTERDITS : montant_ht, marge, cmup, prix_achat, trésorerie, ecriture_comptable
// Champs AUTORISÉS : volume_litres, quantite, ca_boutique (PAS ca_carburant)
```

## ÉTAPE 4 — VALIDATE
- [ ] AUDIT SÉCURITÉ : Aucun rapport ne retourne de données financières (CA carburant, marges, CMUP, trésorerie)
- [ ] Territory Manager : rapports filtrés par ses stations uniquement
- [ ] Volumes carburant en litres (jamais en valeur monétaire)
- [ ] CA boutique affiché mais SANS calcul de marge
- [ ] Réalisations vs Objectifs : uniquement volume litres + CA boutique (jamais de CA carburant)
- [ ] Export CSV disponible sur chaque rapport
- [ ] Filtres station, période, TM fonctionnels
- [ ] TypeScript strict 0 erreur
- [ ] Test : vérifier qu'une query directe depuis compte partenaire ne peut pas accéder aux écritures comptables
</process>

<rules>
- RÈGLE ABSOLUE : Le partenaire ne voit JAMAIS les données financières — zéro exception
- Ne pas adapter les rapports gérant existants (risque de fuite de données) — créer des composants dédiés partenaire
- Toutes les queries passent par un service dédié partnerReportService.ts avec queries explicitement limitées
- CA boutique = sum(lignes_ticket.montant) — jamais de CMUP ni de marge calculée
- Volumes carburant = sum(mouvements_stock.quantite) WHERE type = 'sortie_vente' — pas de valorisation
- Filtrer par partenaire_id à chaque query (RLS + filtre application)
</rules>
