---
description: APEX — Compléter l'interface Superadmin (Dashboard KPIs globaux, AdminExpensesPage, AdminRevenuePage, audit logs avec export, validation stations améliorée)
argument-hint: <aucun — lancer directement>
---

<objective>
L'interface admin a 7 pages de base (AdminDashboard, AdminStations, AdminUsers, AdminSubscriptions, AdminAuditLogs, AdminBugReports, AdminSettings).
Selon le Guide Document §2 et le plan-execution.md, plusieurs composants admin sont manquants ou incomplets :
- AdminDashboardPage : KPIs globaux peu développés (comparer avec la liste)
- AdminExpensesPage : absente
- AdminRevenuePage : absente
- AdminAuditLogsPage : existe mais filtres + export CSV manquants
- AdminStationsPage : validation manuelle stations non-officielles à améliorer
- AdminAlertsList : absent
Compléter ces pages pour donner au superadmin une vision globale et les outils de gestion de plateforme.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §2 "Superadmin — Accès à : dashboard global, comptes gérants, partenaires, validation stations, plan comptable standard, sessions & paramètres"
- src/components/admin/AdminDashboardPage.tsx (12.9k — analyser ce qui existe)
- src/components/admin/AdminStationsPage.tsx (12.6k — analyser validation flow)
- src/components/admin/AdminAuditLogsPage.tsx (7.6k — analyser filtres manquants)
- src/components/admin/AdminSubscriptionsPage.tsx (18.4k — référence pour la complexité)
- src/services/adminService.ts (12.4k — services existants)
- src/types/supabase.ts (tables admin, audit_logs, subscriptions)
- plan-execution.md §12 "Composants admin/" (liste complète attendue)

KPIs dashboard superadmin attendus :
- Nombre total de stations actives / en attente de validation
- Nombre de gérants actifs
- Nombre de partenaires officiels / non-officiels
- Revenus abonnements du mois (si SaaS)
- Top 5 stations par volume carburant
- Alertes : stations sans activité récente, bugs non résolus
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire AdminDashboardPage.tsx en entier — identifier les KPIs déjà affichés vs manquants
2. Lire AdminStationsPage.tsx — comprendre le flow de validation actuel
3. Lire AdminAuditLogsPage.tsx — identifier les filtres manquants
4. Lire adminService.ts — identifier les queries disponibles
5. Vérifier supabase.ts pour les tables admin (audit_logs, subscriptions, stations)

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/admin/
├── AdminExpensesPage.tsx        # Dépenses plateforme
├── AdminRevenuePage.tsx         # Revenus abonnements par partenaire
└── AdminAlertsList.tsx          # Liste alertes système

src/app/(admin)/admin/
├── expenses/page.tsx
└── revenue/page.tsx
```

Fichiers à modifier :
- AdminDashboardPage.tsx — compléter les KPIs globaux
- AdminAuditLogsPage.tsx — ajouter filtres (user, date, type) + export CSV
- AdminStationsPage.tsx — améliorer workflow validation avec motif de rejet
- src/app/(admin)/admin layout.tsx ou sidebar — ajouter liens expenses et revenue

## ÉTAPE 3 — EXECUTE
Ordre d'implémentation :

3.1 — Compléter AdminDashboardPage.tsx :
Ajouter les KPIs manquants en haut :
- Card "Stations actives" + "En attente validation"
- Card "Gérants actifs"
- Card "Partenaires"
- Card "Bugs ouverts" avec lien vers AdminBugReportsPage
Ajouter graphiques recharts :
- Barres : nombre de stations par partenaire
- Courbe : évolution stations actives sur 6 mois

3.2 — Améliorer AdminAuditLogsPage.tsx :
- Ajouter filtres : Select utilisateur, DateRangePicker, Select type action
- Bouton "Exporter CSV" (utiliser exportCsv de lib/utils.ts)
- Pagination (Table shadcn/ui avec pagination)

3.3 — Améliorer AdminStationsPage.tsx :
- Ajouter motif de rejet obligatoire (Dialog avec Textarea)
- Notification au gérant via table notifications quand station validée/rejetée
- Filtre par partenaire et par statut

3.4 — Créer AdminRevenuePage.tsx :
- Liste des partenaires avec montant abonnement mensuel
- Statut paiement (Payé / En attente / Retard)
- Total revenus mois courant
- Graphique recharts courbe évolution 12 mois

3.5 — Créer AdminExpensesPage.tsx :
- Dépenses de la plateforme (serveurs, licences, etc.)
- Formulaire ajout dépense : date, catégorie, montant, description
- Export CSV

3.6 — Créer AdminAlertsList.tsx :
- Stations sans activité depuis 7+ jours
- Bugs non assignés depuis 3+ jours
- Stations en attente de validation depuis 48h+

## ÉTAPE 4 — VALIDATE
- [ ] Dashboard superadmin affiche tous les KPIs mentionnés dans le guide
- [ ] Audit logs : filtres fonctionnels + export CSV valide
- [ ] Validation station : motif de rejet obligatoire si rejeté
- [ ] Notification gérant reçue quand station validée/rejetée
- [ ] AdminRevenuePage charge les données d'abonnements
- [ ] AdminExpensesPage : ajout dépense persiste en DB
- [ ] TypeScript strict 0 erreur
- [ ] Accès restreint superadmin uniquement sur toutes les pages admin
</process>

<rules>
- Le superadmin ne gère PAS les données comptables des gérants — uniquement la plateforme
- Les KPIs du dashboard superadmin sont des agrégats globaux (pas d'accès aux données individuelles)
- Audit logs : immutables — jamais de suppression possible même par le superadmin
- Validation station : toujours envoyer notification au gérant concerné
- Motif de rejet : obligatoire et stocké en DB (champ motif_rejet dans stations)
</rules>
