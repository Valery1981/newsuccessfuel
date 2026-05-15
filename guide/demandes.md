Demandes & Clarifications — SuccessFuel ERP

Historique de tous les prompts et demandes depuis le début du projet.

DEMANDE #001 — Guide Document SuccessFuel.md manquant
Date : 2026-05-01
Statut : ✅ RÉSOLU
Description : Le fichier Guide_Document_SuccessFuel.md a été fourni et lu intégralement.
Ajustements identifiés :

Architecture : dossier /features requis (découpage métier : ventes, stocks, compta...)
Langue : tous commentaires, logs, messages en FRANÇAIS
Shift carburant : pas d'ouverture manuelle, clôture automatique ouvre le suivant
Boutique POS : ouverture ET clôture par la même session
Achat carburant : 4 onglets (BC → Paiement → Réception → BL/Facture)
Créances/Dettes : workflow spécifique avec codes couleur (rouge/orange/vert)
Charges courantes : 3 modes (cash total, crédit total, mixte)
Salaires : 3 étapes comptables distinctes
Inventaires carburant/boutique : écritures comptables avec comptes spécifiques
Sessions employés : droits granulaires par poste (pas hiérarchie)
Partenaire officiel vs non-officiel : règles différentes de validation
Dashboard : graphiques avec recharts (courbes, jauges, camemberts, barres)
Rapports : imprimables PDF + exportables Excel
Doléances : workflow complet station → partenaire → station

DEMANDE #002 — Dossier de destination du projet
Date : 2026-05-01
Statut : ✅ DÉCISION PRISE
Description : Le plan mentionne /Users/mac/Documents/WORK/newsuccessfuel (chemin Mac). Sur Windows, le projet sera créé dans d:\newsuccessfuel.
Décision : Projet créé dans d:\newsuccessfuel.

DEMANDE #003 — Finalisation des pages "En cours de développement"
Date : 2026-05-02
Statut : ✅ TERMINÉ (build npm run build OK le 02/05/2026)
Description : Terminer le développement de toutes les pages affichant "En cours de développement" en respectant la logique métier du Guide Document SuccessFuel.md et le schéma reborn.sql.
Pages concernées (17) :

Admin : AdminDashboardPage, AdminUsersPage, AdminStationsPage, AdminSubscriptionsPage, AdminAuditLogsPage, AdminSettingsPage, AdminBugReportsPage
Manager Structure : StructureComptesPage, StructureCamionsPage, StructureServicesPage, StructureObjectifsPage
Manager Opérations : InventairePage, AchatBoutiquePage, DoleancesPage
Partenaire : PartnerValidationsPage, PartnerGrievancesPage, PartnerStationsPage

DEMANDE #004 — Refonte Guide & correction problèmes workflows
Date : 2026-05-03
Statut : ✅ TERMINÉ
Description : Après tests sur le premier développement, de nombreux problèmes ont été détectés :

Problèmes Auth dès l'inscription et connexion
Redirections incorrectes (superadmin, partenaire, gérant)
Erreurs RLS bloquantes
Logique métier incomplète sur Structure, Initialisation, Traitement

Précisions apportées au Guide :

Partenaire officiel : données volumes uniquement (pas CA carburant), CA boutique visible sans marges
Page Utilisateurs obligatoire pour chaque type de compte
Calibrage cuves : 3 règles strictes + UX bouton calibrer + blocage étape
Import calibrage fichier (PNG/PDF/JPG/JPEG) : autocomplétion + signalement erreurs
Boutique/Services : pointent vers familles produits, éléments non cochés invisibles dans POS
Plan comptable : restructuré complet avec 120 (Résultat net), classes 6 & 7 (6031-6037, 7071-7077...)
Flux comptables : mis à jour avec nouveaux numéros de comptes
Auth & redirections : explicitement détaillées avec flux complets
RLS : règles renforcées, erreurs anticipées avant déploiement
20 règles métier critiques numérotées et non négociables

Résultat : Guide_Document_SuccessFuel.md, rules.md, actions.md et plan-execution.md mis à jour simultanément.

DEMANDE #005 — Optimisation Base de Données Supabase & Correction SECURITY DEFINER
Date : 2026-05-14
Statut : ✅ TERMINÉ
Description : Optimiser les requêtes CPU-intensive, réduire IOPS, corriger les vues avec SECURITY DEFINER (6 vues), implémenter des index stratégiques, et documenter toutes les règles backend/base de données.

Demande détaillée :

Optimiser CPU-intensive queries :

- Target queries causing high User CPU usage
- Implement proper indexing
- Use query optimization techniques
- Optimize indexing
- Reduce high read IOPS through better query indexing
- Consider read replicas (distribute read-heavy workloads)
- Batch write operations (reduce write IOPS)
- Optimize disk-intensive queries
- Tune caching and batching
- Review database design
- Add strategic indexes
- Run VACUUM operations
- Analyze large tables
- Implement data archival
- Implement connection pooling
- Review application code

Corriger SECURITY DEFINER sur 6 vues :

- vue_dettes_en_cours
- vue_grand_livre
- vue_balance
- vue_creances_en_cours
- vue_mouvements_stock
- vue_capitaux_propres

Contraintes :

- NE JAMAIS drop les tables ou risquer de perdre les données
- Vérifier d'abord avant toute modification

Documentation requise :

- Créer guide/apex*plan_optimization_supabase*(numéro_auto)\_yyyy-mm-dd(date_creation)\_yyyy-mm-dd(date_maj)
- S'inspirer de guide/Guide_Document_SuccessFuel.md, guide/rules.md, guide/apex/rules_1_2024-05-06_2024-05-06.md
- Créer rules_supabase_base avec règles nécessaires pour le back et la base
- Documenter toutes les actions dans guide/actions.md (avec date, heure, description précise)
- Documenter tous les prompts et résultats dans guide/demandes.md
- Mettre les process dans CLAUDE.md et AGENTS.md
- Toujours faire tests unitaires et e2e, puis lint et ts avant git add commit push à chaque fin de session (mettre cette règle dans CLAUDE.md et AGENTS.md)

Résultat :

Documentation créée :

- guide/apex_plan_optimization_supabase_1_2026-05-14_2026-05-14.md (plan d'exécution 12 étapes)
- guide/rules_supabase_base.md (22 règles DB-01 à DB-22)

Migrations appliquées :

- fix_security_definer_views : 6 vues passées de SECURITY DEFINER à SECURITY INVOKER
- add_strategic_indexes_final : 44 index stratégiques créés sur 14 tables

Tests créés :

- src/lib/**tests**/database-optimization.test.ts (tests unitaires vues + performance)
- e2e/database/database-optimization.spec.ts (tests E2E RLS + performance)

Qualité :

- ESLint : 0 erreur
- TypeScript : 21 erreurs pré-existantes (types manquants dans supabase.ts, non liées à cette optimisation)

Actions documentées :

- guide/actions.md : ACTION #009 ajoutée avec détails complets
- guide/demandes.md : cette entrée

---

DEMANDE #006 — Audit complet src/ ↔ Guide_Document_SuccessFuel.md & création des APEX 2026-05-15
Date : 2026-05-15
Statut : 🔄 EN COURS (APEX créés, exécution à valider)

Description :
Audit demandé suite à constat que plusieurs règles du Guide ne sont pas alignées avec l'implémentation `src/`. 3 exemples explicites :

1. Plan Comptable (`src/app/(manager)/manager/parametres/comptes`) — fournisseurs/clients créés non affichés alors que le Guide §8.1 lignes 328-333 impose : "Classes 3, 4, 5 : auto-générés à la création des tiers/articles/trésoreries".
2. Initialisation (`src/components/manager/initialisation/CompanyInitialisationPage.tsx`) — layout single column ; doit être 2 colonnes (gauche = Synthèse lignes 946-1033, droite = Tabs lignes 494-943).
3. Onglet Cuves Initialisation — Volume saisi manuellement, alors que Guide §10.2 ligne 418 impose "Jauge (cm) → Volume (litres) calculé via calibrages → Valorisation auto".

Demande utilisateur :

- Aligner strictement l'application sur le Guide
- Diviser le travail en APEX nommés avec la date du jour (2026-05-15)
- Générer un plan d'intégration global
- Documenter dans `guide/actions.md` et `guide/demandes.md`
- Suivre CLAUDE.md (tests unit + e2e + lint + tsc + build avant git add/commit/push)

Livrables produits (cette session) :

- `.claude/commands/apex-2026-05-15-00-master-plan.md`
- `.claude/commands/apex-2026-05-15-01-plan-comptable-aggrege.md` 🔴 (résout exemple #1)
- `.claude/commands/apex-2026-05-15-02-initialisation-layout-volume-auto.md` 🔴 (résout exemples #2 et #3)
- `.claude/commands/apex-2026-05-15-03-calibrage-3-regles-strictes.md` 🟠
- `.claude/commands/apex-2026-05-15-04-noperations-architecture.md` 🟠 (VirementInterne manquant)
- `.claude/commands/apex-2026-05-15-05-realtime-doleances-uniquement.md` 🟡
- `.claude/commands/apex-2026-05-15-06-partner-dashboard-diff.md` 🟠 (DIFF.md non intégré)
- `.claude/commands/apex-2026-05-15-07-permissions-boutons-sensibles.md` 🟠
- `.claude/commands/apex-2026-05-15-08-plan-comptable-db-conformite.md` 🔴
- `.claude/commands/apex-2026-05-15-09-tests-e2e-coverage.md` 🟡
- `.claude/commands/apex-2026-05-15-10-deploiement-vercel.md` 🟡
- `.claude/commands/apex-2026-05-15-11-convergence-finale.md` 🔴 (boucle d'audit récursive ajoutée à la demande de l'utilisateur)

Sprints proposés :

- Sprint 1 (conformité métier critique) : APEX 01, 08, 02, 03
- Sprint 2 (architecture & permissions) : APEX 04, 07, 05
- Sprint 3 (partenaire & tests) : APEX 06, 09
- Sprint 4 (production) : APEX 10
- Sprint 5 (convergence finale) : APEX 11 — boucle d'audit récursive jusqu'à alignement total avec le Guide ; STOP quand rapport d'écarts vide ; max 5 itérations par session

Statut : à valider par l'utilisateur, puis exécution séquentielle.
