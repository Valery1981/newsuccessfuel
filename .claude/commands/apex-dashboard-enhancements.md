---
description: APEX — Améliorer les dashboards (gérant + partenaire) avec toutes les métriques du Guide Document, graphiques recharts et alertes temps réel
argument-hint: <aucun — lancer directement>
---

<objective>
ManagerDashboardPage.tsx (15.9k) et PartnerDashboardPage.tsx (14.9k) existent mais nécessitent une validation approfondie par rapport aux spécifications exactes du Guide Document §11 et §12.
Vérifier et compléter chaque métrique, graphique et alerte mentionnés dans le Guide.
Focus particulier sur :
- Capitaux propres nets = 101 (Capital) + 120 (Résultat net YTD) — temps réel
- Alertes : stocks sous seuil (triés urgence), échéances proches J-3/J-7, écarts carburant non régularisés, doléances en attente
- Graphiques recharts corrects selon les specs
- Performance : chargement ≤ 1 seconde (§18 Guide)
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §11 "DASHBOARD GÉRANT"
- guide/Guide_Document_SuccessFuel.md §12 "INTERFACE PARTENAIRE — Dashboard"
- src/components/manager/ManagerDashboardPage.tsx (état actuel — analyser vs specs)
- src/components/partner/PartnerDashboardPage.tsx (état actuel)
- src/lib/utils.ts (formatCurrency, fonctions utilitaires)
- src/services/ (quels services existent pour les données du dashboard)
- src/stores/authStore.ts (entreprise, compte, role)

Specs exactes Dashboard Gérant (§11) :
- Capitaux propres nets : 101 + 120 = valeur temps réel
- KPIs : CA du mois, Trésorerie totale, Marge brute, Shifts du mois
- Graphiques recharts :
  * CA journalier (BarChart — 30 derniers jours)
  * Réalisations vs Objectifs (barres horizontales %)
  * Trésorerie par compte (jauges/Radial — chaque compte 512/513/514/530)
  * KPI boutique CA + % objectif
- Alertes :
  * Stocks sous seuil (triés urgence — rupture d'abord)
  * Échéances proches J-3 (rouge) et J-7 (orange)
  * Écarts carburant non régularisés
  * Doléances en attente

Specs exactes Dashboard Partenaire (§12) :
- Volume carburant total réseau (pas de CA carburant !)
- % réalisation objectif réseau
- Nombre doléances ouvertes
- CA boutique réseau + % objectif
- Graphiques :
  * Performance par station (barres)
  * Écarts carburant (courbe)
  * Réalisations vs objectifs
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire ManagerDashboardPage.tsx ENTIÈREMENT — comparer chaque section avec le Guide §11
2. Lire PartnerDashboardPage.tsx ENTIÈREMENT — comparer avec Guide §12
3. Vérifier les queries TanStack Query utilisées — sont-elles correctes ?
4. Mesurer (mentalement) la complexité des requêtes — peuvent-elles charger en <1s ?
5. Vérifier les graphiques recharts : types corrects ? (Bar, Line, Radial, BarHorizontal)
6. Identifier les métriques MANQUANTES dans chaque dashboard

## ÉTAPE 2 — PLAN
Lister précisément les écarts entre l'implémentation actuelle et les specs du Guide.
Pour chaque écart : fichier à modifier + section précise + ligne de code à changer.

## ÉTAPE 3 — EXECUTE
Ordre (par priorité business) :
1. Capitaux propres nets = 101 + 120 — si absent ou incorrect, corriger en premier
2. Alertes stocks sous seuil — si absentes, ajouter useQuery stocks + comparaison seuils
3. Alertes échéances J-3/J-7 — query sur créances/dettes avec date_echeance
4. Alertes écarts carburant non régularisés — query inventaires avec écart_regularise=false
5. Graphique CA journalier (BarChart recharts 30 jours)
6. Graphique Trésorerie par compte (RadialBarChart ou Gauge)
7. Graphique Réalisations vs Objectifs (BarChart horizontal avec %)
8. Dashboard partenaire : Volume carburant réseau (litres uniquement — pas de montant)
9. Dashboard partenaire : Graphique performance par station
10. Performance : si chargement > 1s → paralléliser les queries, ajouter index DB si nécessaire

Graphiques recharts à vérifier/créer :
```typescript
// CA journalier — 30 jours
<BarChart data={caJournalier}>
  <Bar dataKey="ca" fill="#F5820A" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip formatter={(v) => formatCurrency(v)} />
</BarChart>

// Trésorerie par compte — Radial ou Bar groupé
// Réalisations vs Objectifs — BarChart horizontal
```

## ÉTAPE 4 — VALIDATE
- [ ] Capitaux propres nets = solde compte 101 + solde compte 120 (cohérent avec Grand Livre)
- [ ] KPIs CA du mois, Trésorerie totale, Marge brute, Shifts du mois — tous présents et exacts
- [ ] Alertes stocks : ruptures (stock=0) en premier, puis sous seuil
- [ ] Alertes échéances : J-3 rouge, J-7 orange, tri par urgence
- [ ] Écarts carburant non régularisés alertés sur le dashboard
- [ ] Dashboard partenaire : PAS de CA carburant — uniquement volumes litres
- [ ] Graphiques recharts affichent des données (pas vides)
- [ ] Chargement dashboard ≤ 1 seconde (mesurer dans DevTools Network)
- [ ] Responsive mobile : KPI cards empilées, graphiques adaptés
- [ ] TypeScript strict 0 erreur
</process>

<rules>
- Dashboard gérant : JAMAIS de volumes litres seuls — toujours valorisé en Ariary
- Dashboard partenaire : JAMAIS de données financières — volumes litres uniquement pour carburant
- Capitaux propres nets = 101 + 120 — c'est la formule exacte du Guide (pas d'actif - passif)
- Performance obligatoire ≤ 1 seconde : paralléliser les useQuery avec Promise.all ou clés séparées
- Alertes doivent avoir des boutons d'action (ex: "Régulariser" → navigate vers inventaire)
- Graphiques recharts : palette de couleurs SuccessFuel (--or #F5820A, --grn #5BB544, --red #F04444, --blu #2B7CC1)
- Dark mode obligatoire (les couleurs recharts doivent fonctionner sur fond sombre --bg #0F1C2E)
</rules>
