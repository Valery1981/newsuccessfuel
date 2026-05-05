---
description: Plan d'exécution ordonné des commandes APEX SuccessFuel — de la priorité critique au déploiement
auto_execution_mode: 2
---

# Plan d'Exécution APEX — SuccessFuel ERP

## Vue d'ensemble

- **14 commandes APEX** dans `.claude/commands/`
- **Ordre basé sur** : dépendances techniques + impact business + risque de régression
- **Durée estimée par commande** : 2-4 heures de développement actif

---

## PHASE 1 — BUGS CRITIQUES (Faire MAINTENANT)

> Ces issues bloquent des fonctionnalités existantes. Ne pas passer à la Phase 2 sans résoudre celles-ci.

### Sprint 1.1 — Non-Sales Operations (BLOQUANT)

**Commande** : `/apex-noperations-panels`
**Pourquoi en premier** : Bug critique confirmé par lecture du code — 6/7 opérations non-vente ne font RIEN quand on clique dessus (dialogs absents). C'est la fonctionnalité comptable la plus importante après achat/vente.
**Dépendances** : Aucune — peut être lancé immédiatement
**Livrable** : ChargesCourantes, Créances, Fournisseurs, Gérant, Immobilisations, Salaires, VirementInterne fonctionnels

### Sprint 1.2 — Sessions Employés + Permissions (BLOQUANT)

**Commandes dans l'ordre** :

1. `/apex-manager-users-sessions` — Créer les sessions employés avec must_change_password
2. `/apex-permissions-modal` — Appliquer les droits granulaires sur les pages

**Pourquoi en second** : Sans système de permissions, n'importe quelle session peut tout faire — y compris clôturer des shifts et comptabiliser des écritures.
**Dépendance** : 1 avant 2 (permissions s'appuie sur les sessions)

---

## PHASE 2 — RAPPORTS MANQUANTS (Impact Business Élevé)

> Le gérant ne peut pas piloter sans ces rapports. Lancer dans l'ordre strict.

### Sprint 2.1 — Rapports Financiers

**Commande** : `/apex-rapports-financiers`
**Pourquoi en premier parmi les rapports** : Le Bilan et le Compte de résultat sont les rapports de base d'un ERP. Sans eux, le module comptable est incomplet.
**Livrable** : Bilan, Compte résultat, Balance âgée fournisseurs/clients, Situation 460

### Sprint 2.2 — Rapports Commerciaux

**Commande** : `/apex-rapports-commerciaux`
**Pourquoi après financiers** : Dépend du même ReportLayout — faire les financiers consolide le pattern
**Livrable** : CA produit, CA pompiste, Comparatif N-1, Réalisations vs Objectifs, Top articles, Marge brute, Créances clients

### Sprint 2.3 — Rapports Stocks Avancés

**Commande** : `/apex-rapports-stocks-avances`
**Pourquoi en dernier des rapports** : Dépend des services inventaire déjà fonctionnels. Plus complexe (graphiques recharts).
**Livrable** : Historique inventaires, Articles seuil/rupture, Faible rotation, Évolution prix, Écarts carburant, Suivi cuves

---

## PHASE 3 — INTERFACE PARTENAIRE (Complétion)

> Le partenaire a une interface basique. La compléter avec users et rapports.

### Sprint 3.1 — Users Partenaire

**Commande** : `/apex-partner-users`
**Dépendance** : Phase 2 (système permissions) doit être fait
**Livrable** : Territory Manager avec filtrage zone géographique

### Sprint 3.2 — Rapports Partenaire

**Commande** : `/apex-partner-rapports`
**Dépendance** : Rapports commerciaux (Sprint 2.2) — adapter les queries pour le partenaire
**RÈGLE CRITIQUE** : Jamais de données financières côté partenaire
**Livrable** : Volumes, stocks, objectifs, doléances (opérationnel uniquement)

---

## PHASE 4 — ENRICHISSEMENT UX (Qualité Produit)

> Améliorer l'expérience sans bloquer les fonctionnalités core.

### Sprint 4.1 — Dashboards Complets

**Commande** : `/apex-dashboard-enhancements`
**Points critiques à corriger** :

- ⚠️ COLORS dans ManagerDashboardPage.tsx utilise des couleurs génériques (#10b981, #3b82f6) — doit être remplacé par les couleurs SuccessFuel (#F5820A, #5BB544, #F04444)
- Capitaux propres nets = 101 + 120 (vérifier calcul)
- Alertes stocks, échéances J-3/J-7

### Sprint 4.2 — Notifications Realtime

**Commande** : `/apex-notifications-realtime`
**Dépendance** : Doléances (déjà implémentées) + auth (déjà implémenté)
**Scope limité** : UNIQUEMENT doléances — pas de Realtime pour les ventes

### Sprint 4.3 — Export PDF

**Commande** : `/apex-export-pdf`
**Dépendance** : Rapports (Phase 2) doivent exister
**Approche** : CSS @media print pour les rapports + @react-pdf pour docs officiels (shift, BL, ticket)

---

## PHASE 5 — ADMINISTRATION (Complétion)

### Sprint 5.1 — Admin Complet

**Commande** : `/apex-admin-complet`
**Livrable** : KPIs globaux, AdminRevenuePage, AdminExpensesPage, AuditLogs avec filtres+CSV

---

## PHASE 6 — QUALITÉ & DÉPLOIEMENT

### Sprint 6.1 — Tests E2E

**Commande** : `/apex-e2e-tests`
**Dépendance** : TOUTES les phases précédentes
**Livrable** : Suite Playwright — auth, onboarding, vente carburant, POS, rapports

### Sprint 6.2 — Déploiement Vercel

**Commande** : `/apex-deploiement-vercel`
**Dépendance** : `npm run build` DOIT réussir à 0 erreur avant de lancer
**Livrable** : vercel.json, variables d'environnement, URL de production

---

## Tableau de Bord d'Avancement

| Phase | Commande                       | Statut  | Priorité    |
| ----- | ------------------------------ | ------- | ----------- |
| 1.1   | `apex-noperations-panels`      | ✅ DONE | 🔴 CRITIQUE |
| 1.2a  | `apex-manager-users-sessions`  | ✅ DONE | 🔴 CRITIQUE |
| 1.2b  | `apex-permissions-modal`       | ✅ DONE | 🔴 CRITIQUE |
| 2.1   | `apex-rapports-financiers`     | ✅ DONE | 🔴 HAUTE    |
| 2.2   | `apex-rapports-commerciaux`    | ✅ DONE | 🔴 HAUTE    |
| 2.3   | `apex-rapports-stocks-avances` | ✅ DONE | 🟠 MOYENNE  |
| 3.1   | `apex-partner-users`           | ✅ DONE | 🟠 MOYENNE  |
| 3.2   | `apex-partner-rapports`        | ✅ DONE | 🟠 MOYENNE  |
| 4.1   | `apex-dashboard-enhancements`  | ✅ DONE | 🟠 MOYENNE  |
| 4.2   | `apex-notifications-realtime`  | ✅ DONE | 🟠 MOYENNE  |
| 4.3   | `apex-export-pdf`              | ✅ DONE | 🟡 BASSE    |
| 5.1   | `apex-admin-complet`           | ✅ DONE | 🟡 BASSE    |
| 6.1   | `apex-e2e-tests`               | ✅ DONE | 🟡 BASSE    |
| 6.2   | `apex-deploiement-vercel`      | ⏳ TODO | 🟡 BASSE    |

---

## Notes d'Exécution

- **Avant chaque sprint** : Lire la commande APEX correspondante dans `.claude/commands/`
- **Après chaque sprint** : Exécuter `npm run build` + `npm run test` pour valider
- **Règle absolue** : Toujours vérifier le Guide Document avant d'implémenter la moindre logique métier
- **MCP Supabase** : Utiliser le MCP `supabase-successfuel` pour inspecter les RLS et valider les écritures SQL
