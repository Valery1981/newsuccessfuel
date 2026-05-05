Règles Globales & Conventions — SuccessFuel ERP

Source de vérité absolue : Guide_Document_SuccessFuel.md
Schéma DB : scripts/reborn.sql (toujours consulter pour les dernières modifs)
Structure technique : GUIDE/plan-execution.md
Ce fichier est la transcription exacte des règles du Guide. Ne modifier que si le Guide est modifié.


STACK TECHNIQUE (OBLIGATOIRE — ne pas dévier)

Frontend : Next.js 16 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
Backend : Supabase uniquement (Auth + PostgreSQL + Realtime + Edge Functions si nécessaire)
Data fetching : TanStack Query (useQuery, useMutation, useInfiniteQuery)
State global : Zustand (authStore, uiStore, dataStore)
i18n : next-intl (fr/en, changement sans rechargement, fallback français)
PWA : next-pwa avec support offline
Validation : Zod (frontend) + PostgreSQL constraints (backend)
Tests : Vitest (unitaires) + Playwright (E2E)
ORM/DB : Supabase JS client uniquement — pas de Prisma
Graphiques : recharts (dashboard uniquement)
Hébergement : Vercel (plan gratuit)


LANGUE

Tous les textes UI, commentaires code, messages, documentation : FRANÇAIS
Variables, fonctions, types TypeScript : anglais (convention internationale)


ARCHITECTURE PROJET (OBLIGATOIRE)
/app
  /(auth) → login, signup, callback
  /onboarding → étapes création entreprise/station
  /(manager) → interface gérant
  /(partner) → interface partenaire
  /(admin) → interface superadmin
/components → composants partagés
/features → découpage métier (ventes, stocks, compta, shifts...)
/hooks → useAuth, useStations, useShifts...
/services → authService, stationService, shiftService...
/lib → utilitaires, config Supabase
/types → types TypeScript (supabase.ts généré)
/scripts → SQL (reborn.sql = référence DB)
/GUIDE → actions.md, demandes.md, plan-execution.md, rules.md
/STYLES → styles HTML de référence (adapter en Tailwind/shadcn)
Logos :

public/favicon.png → splash screen + icône tab navigateur
public/name.png → logo nom (header, login)


CONVENTIONS DE NOMMAGE

Composants : PascalCase (LoginPage, ManagerDashboardPage)
Hooks : camelCase préfixé use (useAuth, useStations)
Services : camelCase suffixé Service (authService, stationService)
Types : PascalCase avec préfixe T si besoin
Fichiers : kebab-case (login-page.tsx, auth-service.ts)
Routes : kebab-case (/manager/fuel-sales)


STRUCTURE DES ROUTES
/public/login         → LoginPage
/public/signup        → SignupPage
/onboarding/*         → OnboardingLayout + étapes
/manager/*            → ManagerLayout (gérant)
/partner/*            → PartnerLayout (partenaire)
/admin/*              → AdminLayout (superadmin)
/auth/callback        → Callback Supabase

AUTH & REDIRECTIONS — RÈGLES CRITIQUES
Flux inscription gérant

/public/signup → création Supabase Auth + enregistrement comptes (type: 'gerant')
RLS activé immédiatement
Redirection /onboarding → informations entreprise + première station
Après validation station → /manager/dashboard

Flux connexion

Tous comptes → /public/login
Après auth → vérifier comptes.type → rediriger :

gerant → /manager/dashboard
partenaire → /partner/dashboard
superadmin → /admin/dashboard


Sessions employés → même redirection selon compte parent

RLS — OBLIGATOIRE

RLS strict sur toutes les tables sensibles
Gérant : voit uniquement ses données (entreprises/stations)
Partenaire : voit uniquement données opérationnelles de son réseau (jamais financières)
Sessions employés : droits du compte parent + restrictions définies
Erreurs RLS "new row violates row-level security policy" : anticipées et corrigées avant déploiement
Pas de queries directes à auth.users côté client → passer par table comptes
Transactions obligatoires pour opérations multi-tables (ACID)


RÈGLES MÉTIER CRITIQUES — NE JAMAIS DÉVIER
1. Comptabilité

Numéros de comptes : totalement invisibles en frontend — jamais affichés sauf Grand Livre/Balance (option)
Partie double : ∑ Débits = ∑ Crédits obligatoire — sinon BLOQUÉ avec message d'erreur
CMUP : calculé automatiquement via trigger SQL calculer_cmup() — méthode unique
Valorisation stock : CMUP uniquement (pas de FIFO, LIFO)
A Nouveau : générés à la validation initialisation pour tous les comptes
Capitaux propres nets = 101 (Capital) + 120 (Résultat net YTD) — temps réel sur dashboard
Logique analytique 6 & 7 : chaque écriture taguée station ou "Central"
Toute logique comptable critique : en SQL (fonctions, triggers) — pas en JavaScript

2. Plan Comptable — Comptes actifs
Classe 1 : 101, 120, 161, 455, 457
Classe 2 : 211, 215, 218, 220, 228, 240
Classe 3 : 310, 320, 330, 340, 350, 360, 370
Classe 4 : 401, 411, 421, 431, 432, 444, 447, 4454, 460
Classe 5 : 512, 513, 514, 530
Classe 6 : 601, 602, 603(centralisateur), 6031-6037, 605, 606, 611-620, 630, 640, 651, 652, 653, 654, 661, 690
Classe 7 : 706(centralisateur), 7061-7063/7069, 707(centralisateur), 7071-7077, 751, 752, 753, 761
3. Carburant — Shifts

Shifts carburant : PAS d'ouverture manuelle — clôture auto ouvre le suivant
Index initial : = index final shift précédent (automatique, non modifiable)
Clôture shift carburant : par supérieur hiérarchique (autre session que pompiste)
Jauge → Volume : via get_volume_from_jauge() (interpolation linéaire calibrages)
Écarts shift non justifiés : attribués automatiquement au 460-xxx du pompiste

4. Calibrage Cuves

Règle 1 : Dernière jauge ≥ capacité maximale de la cuve
Règle 2 : Volumes strictement croissants (chaque volume > précédent)
Règle 3 : Pas de doublons hauteur ni volume
Import fichier (PNG, PDF, JPG, JPEG) : autocomplétion même si erreurs — signaler les points non conformes
Bouton Calibrer → devient statut "Calibré ✓" une fois fait
Blocage étape suivante si toutes les cuves ne sont pas calibrées

5. Boutique POS

Même session ouvre ET clôture le shift boutique (vendeuse titulaire)
Stock : mis à jour en temps réel à chaque vente
Trésorerie : mise à jour en temps réel à chaque paiement
Comptabilisation : groupée à la clôture shift par un responsable autorisé
Services : intégrés dans POS comme catégorie (pas de stock)
Visibilité POS : seuls les articles/services cochés à la création station sont visibles

6. Achats Carburant

4 étapes : BC → Paiement → Réception → BL/Facture
Paiement : écriture immédiate Fournisseur → Trésorerie (date paiement)
Livraison : écriture Stock → Fournisseur (date livraison)
Quantité facturée = volume nominal compartiment (pas la quantité constatée)
Mouvementer avant Comptabiliser : bouton Comptabiliser grisé sans mouventation

7. Achats Boutique

Fournisseur non-partenaire : facture soldée à 0 obligatoirement
Fournisseur partenaire : solde global 401 commun (carburant + lubrifiants)
Fournisseur Non défini : cash automatique, écriture directe sans tiers

8. Inventaires

Carburant justifié : DÉBIT 651 / CRÉDIT 310/320/330
Carburant excédent : DÉBIT 310/320/330 / CRÉDIT 751
Carburant infondé : DÉBIT 460-xxx / CRÉDIT 310/320/330
Boutique justifié : DÉBIT 652 / CRÉDIT 340/350/360/370
Boutique excédent : DÉBIT 340/350/360/370 / CRÉDIT 752
Boutique infondé : DÉBIT 460-xxx / CRÉDIT 340/350/360/370
Motif obligatoire avant régularisation
Régulariser = stock + comptabilité simultanément (droits paramétrables par gérant)

9. Opérations Hors A&V

Virement interne : DÉBIT trésorerie entrante / CRÉDIT trésorerie sortante
Encaissement créances : paiement partiel accepté, solde reste visible, référence obligatoire
Règlement dettes : référence obligatoire, triées par échéance croissante (rouge/orange/vert)
Charges courantes : 3 modes (cash total, crédit total, mixte)
Salaires : 3 étapes (avance au 15 → constatation fin mois → paiement net, solde 421 = 0)
Charges fiscales : TTC traité comme charge (CNAPS→431, OSTIE→432, IRSA→447, TVA→4454, IR→444)

10. Opérations Gérant

Capital apport : DÉBIT Trésorerie / CRÉDIT 101
Capital retrait : DÉBIT 101 / CRÉDIT Trésorerie
Compte courant : 455 (apport: Trésorerie→455, retrait: 455→Trésorerie)
Dividendes affectation : DÉBIT 120 / CRÉDIT 457 (pas de trésorerie)
Dividendes distribution : DÉBIT 457 / CRÉDIT Trésorerie

11. Immobilisations

Acquisition : DÉBIT 2xxx / CRÉDIT Trésorerie ou 401-xxx (ou mixte)
Cession perte : DÉBIT Trésorerie + DÉBIT 653 / CRÉDIT 2xxx
Cession bénéfice : DÉBIT Trésorerie / CRÉDIT 2xxx + CRÉDIT 753
Pas d'amortissement dans Successfuel

12. Transferts de Stock

Entre stations : même entreprise uniquement
Pas d'écriture comptable générée
Valorisation = CMUP station d'origine
CMUP destination recalculé après réception

13. Tiers — Auto-numérotation

Fournisseur : 401-001, 401-002... (via generer_numero_tiers())
Client : 411-001, 411-002...
Employé : 421-xxx + 460-xxx créés simultanément et automatiquement

14. Initialisation

Accès : gérant uniquement (collaborateurs, partenaire, superadmin exclus)
Enregistrer : sauvegarde temporaire, modifiable, aucune écriture générée
Valider : irréversible — génère A Nouveau + mouvements initiaux + calcul 101 + 120
Capital Net = Total Actif − Total Dettes (calculé et affiché au gérant)

15. Sessions & Utilisateurs

Page Utilisateurs obligatoire pour chaque type de compte (gérant, partenaire, superadmin)
Droits granulaires par page et fonctionnalité (pas par hiérarchie)
Dashboard gérant : accès gérant uniquement (collaborateurs → rapports autorisés uniquement)
Territory Manager : filtré par zone géographique

16. Partenaire Officiel — Restrictions

Voit : volumes carburant, stocks, achats, écarts, réalisations vs objectifs, CA boutique (sans marges)
Ne voit PAS : CA carburant, marges, données financières, comptabilité, trésorerie, salaires
Création compte partenaire : superadmin uniquement

17. Prix Carburant

PA carburant = Prix de vente − Marge (calculé auto)
Historisation obligatoire : tout changement = nouvel enregistrement daté
Opérations passées conservent leurs prix d'époque


FLUX COMPTABLES COMPLETS PAR OPÉRATION
Achat Carburant
Paiement (date paiement) :
DÉBIT 401-xxx / CRÉDIT 512/513/514-xxx

Livraison (date livraison) :
DÉBIT 310/320/330 / CRÉDIT 401-xxx

Coût des ventes (à la mouventation) :
Mouvement stock : entree_achat, volume nominal × PA → CMUP recalculé
Vente Carburant (shift)
DÉBIT 512/513/514/530-xxx (paiements)
DÉBIT 411-xxx (crédit client)
DÉBIT 460-xxx (manquant pompiste)
CRÉDIT 7071/7072/7073 (selon carburant, tagué station)

Coût des ventes :
DÉBIT 6031/6032/6033 / CRÉDIT 310/320/330 (× CMUP)
Vente Boutique (clôture shift)
DÉBIT 530/512/513-xxx
DÉBIT 411-xxx (crédit client)
DÉBIT 460-xxx (écart caisse vendeuse)
CRÉDIT 7074/7075/7076/7077 (selon famille, tagué station)
CRÉDIT 7061/7062/7063/7069 (services)

Coût des ventes :
DÉBIT 6034/6035/6036/6037 / CRÉDIT 340/350/360/370 (× CMUP)
Achat Boutique
Cash : DÉBIT 340/350/360/370 / CRÉDIT Trésorerie
Crédit : DÉBIT 340/350/360/370 / CRÉDIT 401-xxx → Règlement dettes
Mixte : DÉBIT 340/350/360/370 / CRÉDIT Trésorerie + 401-xxx
Non défini : DÉBIT 340/350/360/370 / CRÉDIT Trésorerie (direct)

ARTICLES / PRODUITS

6 familles figées : Carburants, Lubrifiants, GPL, Marchandises générales, Pièces & accessoires, Services
Hiérarchie : Famille → Catégorie → Article
Catégories : uniquement pour Marchandises générales et Pièces & accessoires
Carburants : gérés via cuves/pistolets (pas dans boutique)
Services : pas de stock, compte 706x direct


PATTERNS UI OBLIGATOIRES

Mobile-first : tous composants responsive
Tables : scroll horizontal mobile, pagination obligatoire
Sidebar : drawer/collapsible mobile
Loading states : Skeleton shadcn/ui — chargement ≤ 1 seconde
Erreurs : Toast (sonner) + pages dédiées (404, 500, offline)
Confirmation : Dialog shadcn/ui avant toute action irréversible
Codes couleur créances/dettes : rouge (dépassé), orange (urgent < 7j), vert (normal)
Select : afficher les noms, jamais les IDs
Design : se référer au dossier STYLES (adapter en Tailwind/shadcn)


SUPABASE — RÈGLES

Toutes les queries respectent RLS via auth.uid()
Pas de queries directes à auth.users côté client
Toute logique métier critique EN SQL (fonctions, triggers)
Transactions obligatoires pour opérations multi-tables (ACID)
Realtime UNIQUEMENT pour ventes live et mises à jour critiques
Fonctions SQL clés : get_volume_from_jauge(), calculer_cmup(), verifier_partie_double(), generer_numero_tiers(), generer_numero_tresorerie()


TYPESCRIPT

strict: true dans tsconfig
Pas de any sauf cas exceptionnel documenté
Interfaces pour props composants
Enums pour types constants (status, roles...)
Explicit return types sur fonctions de service


CACHE (TanStack Query)

staleTime: 5 * 60 * 1000 (5 min)
gcTime: 10 * 60 * 1000 (10 min)
refetchOnWindowFocus: true
refetchOnReconnect: true
Invalidation sur mutation via queryClient.invalidateQueries


PERFORMANCE

TanStack Query : cache + revalidation
Lazy loading des pages
Pagination obligatoire sur toutes les tables
Materialized views pour rapports lourds
Index SQL sur colonnes critiques
Chargement pages et requêtes : ≤ 1 seconde


TESTS — OBLIGATOIRES À CHAQUE FIN DE SESSION
bash# Lancer et corriger avant de passer à la suite :
npm run test          # Vitest unitaires
npx playwright test   # E2E
npm run lint          # ESLint 0 erreur
npx tsc --noEmit     # TypeScript 0 erreur
npm run build         # Build doit réussir

Base de données mockée pour tous les tests
Tests unitaires : logique métier isolée
Tests E2E : flux utilisateur complets
Pour chaque fonctionnalité : happy path + error path + valeurs correctes/incorrectes
Composants UI, logique métier, RLS, toasts, états de chargement, permissions


PROCESSUS DE VALIDATION
Une fonctionnalité est TERMINÉE seulement si :

Tests automatisés passent (unitaires, E2E, lint, tsc, build)
Test manuel utilisateur validé
Logique respecte strictement Guide_Document_SuccessFuel.md
rules.md à jour si nécessaire
todo.md mis à jour
actions.md mis à jour

Processus test manuel :

Tests auto passent → demander si test manuel souhaité
Si OUI → indiquer URL, données de test, étapes, résultats attendus, points de vigilance
Si NON valide → analyser logs, corriger, re-tester
Si validé → passer au design


FICHIERS DE SUIVI

GUIDE/actions.md : toutes les actions depuis le début du projet
GUIDE/demandes.md : historique tous les prompts
GUIDE/plan-execution.md : modifié uniquement si Guide modifié
GUIDE/rules.md : ce fichier — modifié uniquement si Guide modifié
todo.md (racine) : mis à jour à chaque tâche terminée
Ne plus faire d'audit si Guide_Document_SuccessFuel.md est à jour