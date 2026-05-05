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