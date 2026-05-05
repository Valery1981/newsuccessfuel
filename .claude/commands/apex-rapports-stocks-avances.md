---
description: APEX — Implémenter les rapports de stocks avancés manquants (Historique inventaires, Articles seuil/faible rotation, Évolution prix achat, Écarts carburant, Suivi cuves)
argument-hint: <aucun — lancer directement>
---

<objective>
Les rapports de base (StockCarburant, StockBoutique, MouvementsStock) existent dans src/components/reports/stocks/.
Implémenter les 6 rapports de stocks avancés manquants selon §13 du Guide Document SuccessFuel.
Le dossier src/components/reports/stock/ (sans 's') est vide — créer les composants là.
Ces rapports permettent au gérant de piloter la gestion des stocks, anticiper les ruptures et analyser les écarts carburant.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §13 "Rapports Stocks"
- guide/Guide_Document_SuccessFuel.md §10.6 "INVENTAIRE CARBURANT" et §10.7 "INVENTAIRE BOUTIQUE"
- src/components/reports/stocks/ (StockCarburantReport.tsx, StockBoutiqueReport.tsx, MouvementsStockReport.tsx — exemples)
- src/services/inventaireService.ts (logique inventaire existante)
- src/types/supabase.ts (tables : inventaires, mouvements_stock, articles, cuves, calibrages)

Rapports à créer :
1. Historique inventaires et écarts :
   - Liste tous les inventaires passés (carburant + boutique)
   - Par inventaire : date, stock théorique, stock réel, écart (volume ou quantité), motif, régularisation effectuée
   - Filtres : station, type (carburant/boutique), période

2. Articles sous seuil d'alerte / en rupture :
   - Liste articles avec stock actuel < seuil d'alerte défini dans Structure
   - Indicateur "EN RUPTURE" si stock = 0
   - Trié par urgence (rupture d'abord, puis sous seuil)
   - Inclure : article, famille, stock actuel, seuil, unité, station

3. Articles à faible rotation :
   - Articles avec peu ou pas de ventes sur la période sélectionnée
   - Calcul : nombre de ventes + quantité vendue sur période
   - Identifier les articles "dormants" (0 vente sur 30 jours)
   - Valorisation stock immobilisé (quantité × CMUP)

4. Évolution prix d'achat par article :
   - Historique des prix d'achat sur la période
   - Graphique recharts courbe des prix + CMUP
   - Variation % entre premier et dernier prix
   - Filtres : article, famille, station

5. Rapport écarts carburant par station :
   - Récap des écarts inventaire carburant par station et par période
   - Colonnes : station, cuve, date inventaire, stock théorique, stock réel, écart litres, écart %, motif
   - Total écarts sur la période
   - Alerte si écart > seuil configuré

6. Suivi cuves — historique jauges :
   - Historique des jauges (cm) et volumes (litres) par cuve
   - Graphique recharts courbe d'évolution du niveau cuve
   - Inclure : date/heure, jauge cm, volume litres, type mouvement (entrée achat / sortie vente / inventaire)
   - Filtres : station, cuve, période
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire src/components/reports/stocks/StockCarburantReport.tsx et MouvementsStockReport.tsx pour le pattern exact
2. Analyser src/services/inventaireService.ts pour comprendre les queries d'inventaire disponibles
3. Vérifier dans supabase.ts : tables inventaires, mouvements_stock, articles, cuves, seuils_alerte
4. Identifier si des Supabase views ou fonctions existent pour les calculs d'écart
5. Vérifier src/lib/utils.ts pour interpolateVolume() (jauge→volume via calibrages)

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/reports/stock/
├── HistoriqueInventairesReport.tsx    # Historique inventaires + écarts
├── ArticlesSeuhlAlertReport.tsx       # Articles sous seuil / en rupture
├── FaibleRotationReport.tsx           # Articles faible rotation
├── EvolutionPrixAchatReport.tsx       # Évolution prix achat par article
├── EcartsCarburantReport.tsx          # Écarts carburant par station
└── SuiviCuvesReport.tsx               # Historique jauges cuves
```

Routes à créer :
```
src/app/(manager)/manager/rapports/
├── historique-inventaires/page.tsx
├── articles-alerte/page.tsx
├── faible-rotation/page.tsx
├── evolution-prix/page.tsx
├── ecarts-carburant/page.tsx
└── suivi-cuves/page.tsx
```

## ÉTAPE 3 — EXECUTE
Ordre d'implémentation :
1. ArticlesSeuhlAlertReport.tsx — le plus urgent pour les gérants
2. EcartsCarburantReport.tsx — données directement dans table inventaires
3. HistoriqueInventairesReport.tsx — liste des inventaires passés
4. FaibleRotationReport.tsx — calcul rotation sur mouvements_stock
5. EvolutionPrixAchatReport.tsx — historique CMUP + graphique recharts
6. SuiviCuvesReport.tsx — historique jauges avec graphique recharts
7. Routes page.tsx
8. Mise à jour ManagerRapportsPage.tsx

Pour les graphiques recharts dans EvolutionPrixAchatReport et SuiviCuvesReport :
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
// Couleur --or: #F5820A (orange SuccessFuel) pour les courbes
```

Calcul faible rotation :
```typescript
// Pour la période sélectionnée, compter les mouvements de type 'sortie_vente_boutique'
// Articles avec 0 mouvements = dormants
// Articles avec < moyenne_réseau = faible rotation
const stockImmobilise = quantite * cmup
```

## ÉTAPE 4 — VALIDATE
- [ ] ArticlesSeuil : chaque station affiche les bons seuils configurés dans Structure
- [ ] Ruptures (stock=0) triées avant les articles sous seuil
- [ ] EcartsCarburant : cohérent avec les données de la page Inventaire
- [ ] SuiviCuves : volumes calculés via interpolation calibrage (pas valeur brute)
- [ ] Graphiques recharts s'affichent correctement
- [ ] Évolution prix : calcul % variation correct
- [ ] Export CSV sur tous les rapports
- [ ] Filtres station et période fonctionnels
- [ ] TypeScript strict 0 erreur
</process>

<rules>
- Utiliser interpolateVolume() de src/lib/utils.ts pour jauge→volume (ne pas recalculer)
- Graphiques recharts : utiliser la palette de couleurs SuccessFuel (--or #F5820A, --grn #5BB544, --red #F04444)
- Articles sous seuil : badge rouge "RUPTURE" si stock=0, badge orange "ALERTE" si stock<seuil
- Les écarts carburant négatifs (manquants) en rouge, positifs (excédents) en vert
- Tous les volumes en litres avec 2 décimales
- Tous les montants avec formatCurrency()
</rules>
