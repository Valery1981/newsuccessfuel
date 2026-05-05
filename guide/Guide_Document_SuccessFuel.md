SUCCESSFUEL — Guide Document Complet

Source de vérité absolue — Toute logique métier, technique et architecturale doit respecter ce document.
Le fichier rules.md doit être la transcription exacte de ce document.
Le fichier plan-execution.md ne doit être modifié que si ce document est modifié.
Le fichier reborn.sql (dans /scripts) est la référence base de données.


1. PRÉSENTATION GÉNÉRALE
Successfuel est un ERP vertical online-first spécialisé dans la gestion de stations-service pour le marché africain francophone. Il combine les fonctionnalités de Sage Comptabilité et Sage Gestion Commerciale en une seule plateforme unifiée, conçue pour être accessible aux non-initiés en comptabilité.
Philosophie fondamentale :

La comptabilité se génère automatiquement en arrière-plan à chaque opération
Les numéros de comptes comptables sont totalement invisibles en frontend — ils n'apparaissent nulle part dans l'interface utilisateur, sauf dans les rapports comptables avancés (Grand Livre, Balance) où ils peuvent être affichés en option pour les initiés
Chaque action de l'utilisateur génère automatiquement les écritures comptables et les mouvements de stocks correspondants
Les rapports sont riches, flexibles, imprimables en PDF et exportables en Excel
L'application est multi-stations et multi-comptes


2. TYPES DE COMPTES & SESSIONS
Superadmin

Administrateur global de la plateforme Successfuel
Crée les comptes partenaires officiels (accès superadmin uniquement)
Valide les stations dont le partenaire est non officiel
A ses propres sessions internes avec droits granulaires
Accès à : dashboard global, comptes gérants, partenaires, validation stations, plan comptable standard, sessions & paramètres

Gérant

S'inscrit via la page Sign In → compte gérant créé automatiquement
Admin de son propre compte entreprise
Peut gérer plusieurs entreprises mais avec des comptes différents
Dans un seul compte : peut gérer plusieurs stations si même entité fiscale et même comptabilité (capital commun)
Crée des sessions pour ses employés avec droits granulaires par poste (pas par hiérarchie)
Seul à accéder au dashboard gérant — les collaborateurs voient uniquement les rapports autorisés

Partenaire Officiel

Compagnie pétrolière ayant contracté avec Successfuel
Compte créé uniquement par le superadmin
Rôle consultatif — accès aux données opérationnelles uniquement
Voit : volumes vendus (carburant), stocks, achats, réalisations vs objectifs, écarts stocks carburant, CA boutique (sans marges)
Ne voit PAS : CA carburant, marges, données financières, données comptables, trésorerie détaillée, salaires, charges
A un dashboard synthétique réseau + page Rapports détaillés
Valide les stations de son réseau
Co-finance une partie de l'abonnement des stations
Crée des sessions pour son équipe (Territory Managers filtrés par zone géographique)

Partenaire Non Officiel

Pas de contrat avec Successfuel
Certaines de leurs stations utilisent Successfuel
Validation des stations assurée par le superadmin

Sessions Utilisateurs — RÈGLE CRITIQUE

Les 3 types de comptes (superadmin, gérant, partenaire) peuvent avoir plusieurs sessions
Une page Utilisateurs est obligatoire pour chaque type de compte pour créer et gérer les sessions et leurs autorisations
Droits granulaires page par page et fonctionnalité par fonctionnalité (pas par rôle hiérarchique)
Chaque session est rattachée à un employé nommé
Exemple : un comptable et un chef de piste peuvent être au même niveau hiérarchique mais accéder à des pages entièrement différentes
Côté partenaire : l'admin partenaire voit tout le réseau, le Territory Manager est filtré par zone géographique


3. STACK TECHNIQUE (OBLIGATOIRE — ne pas dévier)

Frontend : Next.js 16 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui
Backend : Supabase uniquement (Auth + PostgreSQL + Realtime + Edge Functions si nécessaire)
Data fetching : TanStack Query (useQuery, useMutation, useInfiniteQuery)
State global : Zustand (authStore, uiStore)
i18n : next-intl (fr/en, changement sans rechargement)
PWA : next-pwa avec support offline
Validation : Zod (frontend) + PostgreSQL constraints (backend)
Tests : Vitest (unitaires) + Playwright (E2E)
ORM/DB : Supabase JS client uniquement, pas de Prisma
Graphiques : recharts (dashboard)
Hébergement : Vercel (plan gratuit)
Langue UI : FRANÇAIS pour tous les textes, messages, commentaires


4. ARCHITECTURE PROJET
/app
  /public → login, signup
  /onboarding → étapes création entreprise/station
  /manager → interface gérant
  /partner → interface partenaire
  /admin → interface superadmin
  /auth/callback → callback Supabase
/components → composants partagés
/features → découpage métier (ventes, stocks, compta, shifts...)
/hooks → hooks custom (useAuth, useStations, useShifts...)
/services → services Supabase (authService, stationService...)
/lib → utilitaires, config Supabase
/types → types TypeScript
/scripts → fichiers SQL (reborn.sql = référence DB)
/GUIDE → actions.md, demandes.md, plan-execution.md, rules.md
STYLES → styles HTML de référence (à adapter en Tailwind/shadcn)
Logos :

public/favicon.png → splash screen + icône tab navigateur
public/name.png → logo nom uniquement (header, login)


5. DESIGN SYSTEM
Palette Dark Mode (identité officielle Successfuel)
css--or: #F5820A;              /* Orange dominant — actions, CTA */
--or-light: rgba(245,130,10,0.12);
--blu: #2B7CC1;             /* Bleu pistolet — accents */
--nav: #1B3D6F;             /* Bleu marine — sidebar */
--nav3: #0F2240;
--grn: #5BB544;             /* Vert — indicateurs positifs */
--bg: #0F1C2E;              /* Fond principal */
--card: #1A2B3E;            /* Fond cartes */
--txt: #F0F4F8;             /* Texte principal */
--txt2: #94A8BE;            /* Texte secondaire */
--brd: rgba(255,255,255,0.07);
--red: #F04444;
--gold: #F5A623;
Règles UI Obligatoires

Mobile-first, tous composants responsive
Tables : scroll horizontal mobile, pagination obligatoire
Sidebar : drawer/collapsible mobile
Loading states : Skeleton shadcn/ui
Erreurs : Toast (sonner) + pages dédiées (404, 500, offline)
Confirmation : Dialog shadcn/ui avant toute action irréversible
Codes couleur créances/dettes : rouge (dépassé), orange (urgent < 7j), vert (normal)
Select : afficher les noms, jamais les IDs
Chargement pages et requêtes : ne pas dépasser 1 seconde
Se référer au dossier STYLES pour l'adaptation Tailwind/shadcn


6. AUTH & REDIRECTIONS — RÈGLES CRITIQUES
Flux d'inscription (gérant)

Page /public/signup → création compte Supabase Auth + enregistrement dans table comptes (type: 'gerant')
RLS activé immédiatement → le gérant ne voit que ses données
Redirection vers /onboarding → étapes informations entreprise + création première station
Après validation station → redirection vers /manager/dashboard

Flux de connexion

Tous types de comptes → /public/login
Après auth Supabase → vérifier comptes.type → rediriger vers le bon layout :

gerant → /manager/dashboard
partenaire → /partner/dashboard
superadmin → /admin/dashboard


Sessions employés → même redirection selon le compte parent

RLS — Règles de sécurité critiques

RLS strict sur toutes les tables sensibles
Chaque gérant ne voit que les données de ses entreprises/stations
Le partenaire voit uniquement les données opérationnelles des stations de son réseau (jamais financières)
Les sessions employés héritent des droits du compte parent + restrictions supplémentaires définies
Toutes les erreurs RLS du type "new row violates row-level security policy" doivent être anticipées et corrigées avant déploiement
Pas de queries directes à auth.users côté client (passer par la table comptes)


7. ONBOARDING GÉRANT — CRÉATION ENTREPRISE & STATION
Étape 1 — Inscription
Page Sign In → compte gérant automatique → redirection onboarding
Étape 2 — Informations Entreprise
Nom, Pays, Adresse, NIF, STAT, RCS, informations fiscales, téléphone, WhatsApp
Étape 3 — Création Station (workflow en 4 sous-étapes)
Sous-étape 3.1 — Informations station
Nom, Partenaire (liste partenaires + option "Non officiel"), Adresse, Téléphone, Coordonnées GPS
Sous-étape 3.2 — Cuves & Calibrages
Création cuve :

Nom/N° cuve, Type carburant (SP95, SP91, GO, Pétrole), Capacité max (litres)
La cuve créée apparaît immédiatement dans une liste en bas
À l'extrémité droite de chaque cuve dans la liste : bouton "Calibrer"
Une fois calibrée, le bouton se transforme en statut "Calibré ✓"
On ne passe pas à l'étape suivante tant que toutes les cuves ne sont pas calibrées

Calibrage d'une cuve (règles strictes) :

Saisie point par point : Hauteur (cm) → Volume (litres), de 1cm à 300cm
Règle 1 : La dernière jauge saisie doit être ≥ à la capacité maximale de la cuve
Règle 2 : Chaque volume suivant doit être strictement supérieur au précédent (croissance monotone)
Règle 3 : Pas de doublons ni pour la hauteur ni pour le volume
Bouton d'import (PNG, PDF, JPG, JPEG) : importer un fichier de calibrage

Utiliser les packages gratuits nécessaires pour lire ces formats
Extraire uniquement le tableau de calibrage du fichier (ignorer le reste du texte)
Autocompléter les champs de calibrage point par point avec les valeurs extraites
L'autocomplétion n'est pas une validation : si des valeurs ne respectent pas les règles, afficher une erreur sur les points concernés pour que l'utilisateur puisse corriger
L'autocomplétion se fait même si certaines valeurs sont incorrectes



Sous-étape 3.3 — Pistolets

Création des pistolets : N° pistolet + Cuve associée + Type carburant

Sous-étape 3.4 — Boutique & Services

Cocher les éléments présents dans la station
Boutique (familles produits) : Marchandises générales, Lubrifiants, GPL, Pièces et accessoires autos
Services : Lavage, Vulcanisation, Entretien, Parking
Ces cases pointent vers les familles produits de la base (pas des textes statiques)
Les éléments non cochés ne doivent pas apparaître dans les interfaces de vente ni d'achat

Étape 4 — Attente validation

Partenaire officiel → notification au partenaire pour validation dans son interface
Partenaire non officiel → notification au superadmin pour validation


8. PAGE STRUCTURE
8.1 Plan Comptable
Plan comptable standard complet :
Classe 1 — Capitaux :

101 Capital
120 Résultat net (utilisé dans calcul capitaux propres nets dashboard)
161 Emprunt à long terme
455 Comptes courants associés
457 Dividendes à distribuer

Classe 2 — Immobilisations :

211 Matériels et mobilier de bureau
215 Matériels roulants
218 Matériels informatiques
220 Matériels et outillages
228 Équipements spécifiques
240 Cautions et dépôts de garantie

Classe 3 — Stocks :

310 Stock Essence (SP95/SP91)
320 Stock Gasoil
330 Stock Pétrole lampant
340 Stock Lubrifiants
350 Stock GPL
360 Stock Marchandises générales
370 Stock Pièces et accessoires autos

Classe 4 — Tiers :

401 Fournisseurs
411 Clients
421 Rémunérations dues
431 CNAPS à payer
432 OSTIE à payer
444 IR à payer
447 IRSA à payer
4454 TVA à payer
460 Responsabilité opérationnelle

Classe 5 — Trésorerie :

512 Banque
513 Mobile Money
514 Note de crédit
530 Caisse

Classe 6 — Charges :

601 Petit outillage et accessoires divers
602 Fournitures de bureau
603 Coût des ventes (centralisateur)

6031 CAMV Essence
6032 CAMV Gasoil
6033 CAMV Pétrole lampant
6034 CAMV Marchandises générales
6035 CAMV Lubrifiants
6036 CAMV GPL
6037 CAMV Pièces et accessoires


605 Eau et électricité
606 Fournitures administratives
611 Locations
612 Entretien et réparations
613 Primes d'assurances
614 Personnel extérieur
615 Consultance
616 Publications, impression et marketing
617 Frais de transport
618 Missions et réception
619 Frais de télécommunications
620 Services bancaires
630 Impôts et taxes diverses
640 Salaires
651 Écarts négatifs sur carburants
652 Écarts négatifs sur articles boutique
653 Pertes sur cessions d'immobilisations
654 Pertes sur créances irrécouvrables
661 Charges financières
690 Impôt sur les bénéfices

Classe 7 — Produits :

706 Prestations de services (centralisateur)

7061 Vente Lavage
7062 Vente Vulcanisation
7063 Vente Parking
7069 Autres prestations


707 Ventes produits (centralisateur)

7071 Vente Essence
7072 Vente Gasoil
7073 Vente Pétrole lampant
7074 Vente Marchandises générales
7075 Vente Lubrifiants
7076 Vente GPL
7077 Vente Pièces et accessoires


751 Écarts positifs sur carburants
752 Écarts positifs sur articles boutique
753 Gains sur cessions d'immobilisations
761 Produits financiers

Règles plan comptable :

Plan standard préchargé en base, commun à toutes les entreprises
Personnalisation classes 1 & 2 uniquement par le gérant (sous-comptes auto-numérotés : 215-001, 215-002...)
Classes 3, 4, 5 : auto-générés à la création des tiers/articles/trésoreries
Classes 6 & 7 : figés, logique analytique par station ou "Central"
Numéros de comptes invisibles en frontend partout sauf Grand Livre et Balance (option)
Règle centralisateur : si sous-comptes créés, le parent ne reçoit plus d'écritures directes

8.2 Tiers
Fournisseurs : 401-001, 401-002... (auto-incrémenté)

Flag "Partenaire carburant" : si coché, compte 401 commun aux achats carburant ET lubrifiants

Clients : 411-001, 411-002...

Flag "Crédit autorisé" : oui/non

Employés : 421-001 + 460-001 créés simultanément et automatiquement

Le 460 est le compte de Responsabilité Opérationnelle (gestion manquants shifts)

8.3 Articles / Produits
6 familles figées (non modifiables) :
Carburants, Lubrifiants, GPL, Marchandises générales, Pièces & accessoires autos, Services
Hiérarchie : Famille → Catégorie → Article

Catégories : uniquement pour Marchandises générales et Pièces & accessoires autos
Lubrifiants et GPL : pas de catégorie
Carburants : gérés via cuves/pistolets (pas dans boutique)
Services : pas de stock

Onglet 1 — Création article :
Famille, Catégorie, Nom, Unité, Conditionnement, Code-barres (EAN13 auto ou manuel)
Onglet 2 — Paramètre Station :

Prix de vente par station (chaque station a ses propres prix)
Prix d'achat : saisi manuellement à chaque achat (sauf carburant)

8.4 Trésorerie

Choix du type → libellé libre → numéro auto-généré
Types : Banque (512-xxx), Mobile Money (513-xxx), Note de crédit (514-xxx), Caisse (530-xxx)

8.5 Prix Carburant (par station — historisé)

Prix de vente (réglementé ou défini partenaire)
Marge par litre (contrat partenaire, saisie par gérant)
Prix d'achat = PV − Marge (calculé automatiquement)
Historisation obligatoire : tout changement crée un nouvel enregistrement daté
Les opérations passées conservent leurs prix d'époque

8.6 Objectifs

Carburant & Lubrifiants : objectif en volume (litres) — global ou par produit spécifique
Boutique : objectif en CA (Ariary) mensuel
Services : pas d'objectif
Paramétrable par station, par période

8.7 Seuils d'alerte stocks

Par article, par station
Alerte automatique si stock ≤ seuil → dashboard + notifications

8.8 Camions

N° immatriculation, Transporteur, Capacité totale, Nombre compartiments, Volume max/compartiment
Utilisé dans la réception des achats carburant


9. PAGE INITIALISATION — RÈGLES CRITIQUES
Accès : Gérant uniquement (collaborateurs, partenaire et superadmin exclus)
Logique Enregistrer vs Valider

Enregistrer (par onglet) : sauvegarde temporaire, modifiable, aucune écriture générée
Valider Initialisation (bouton global, irréversible) :

Génère les A Nouveau dans le Grand Livre pour tous les comptes renseignés
Génère les entrées initiales dans les mouvements de stock
Calcule et affiche Capital Net (101) = Total Actif − Total Dettes
Affiche les Capitaux propres nets = 101 + 120
Verrouille définitivement la page



Éléments par Station (sélecteur de station en haut)
Onglet Index Pistolets :

Index de départ par pistolet — sert de base au premier shift uniquement

Onglet Cuves :

Jauge (cm) → Volume (litres) calculé via calibrages → Valorisation auto

Onglet Stock Boutique :

Quantités + Prix d'achat initial par article → Valorisation CMUP de départ

Éléments communs à l'entreprise

Onglet Immobilisations (classes 2)
Onglet Tiers (soldes fournisseurs, clients, employés)
Onglet Trésorerie (soldes de chaque compte)
Onglet Autres dettes (LT, fiscales, sociales, associés)


10. PAGE TRAITEMENT
10.1 ACHAT CARBURANT — 4 Onglets
Onglet 1 — Bon de Commande (BC) :

Numéro BC généré automatiquement (référence de toute la chaîne)
Multi-stations + multi-produits sur un seul BC
Quantités indicatives uniquement

Onglet 2 — Paiement :

Multi-modes : Note de crédit (514), Chèque (512), Virement (512), Mobile Money (513)
Pré-comptabilisation immédiate :

DÉBIT  : 401-xxx (Fournisseur partenaire)
CRÉDIT : 512/513/514-xxx (Trésorerie)
[Réf : N° BC | date paiement]

Le solde n'est pas forcément nul (solde global fournisseur partenaire)

Onglet 3 — Réception :

Sélection camion + compartiments concernés par station
Jauge avant dépotage (cm) → Volume via calibrage
Jauge après dépotage (cm) → Volume via calibrage
Écart livraison = (Jauge après − Jauge avant) − Volume nominal compartiment → indicatif
Quantité facturée = volume nominal compartiment (pas la quantité constatée)

Onglet 4 — BL/Facture (récapitulatif) :

N° BC + N° BL + N° Camion + quantités + montant + paiements + écarts
Imprimable une fois mouvementé ET comptabilisé

Actions sur chaque achat : Voir détails | Modifier | Mouvementer stock | Comptabiliser
Flux stock — Mouvementer stock :
→ Entrée stock : +Volume nominal (litres) par cuve
→ Compte : 310/320/330 selon type carburant
→ CMUP recalculé : (Stock × CMUP_ancien + Volume × PA) ÷ (Stock + Volume)
→ PA carburant = Prix de vente − Marge (depuis paramètre prix carburant)
→ Jauge cuve mise à jour
→ Mouvement enregistré : type "entree_achat", date livraison, N° BL
Flux comptable — Comptabiliser :
Date livraison :
DÉBIT  : 310/320/330 (Stock carburant — volume nominal × PA)
CRÉDIT : 401-xxx (Fournisseur partenaire)
[Réf : N° BC + N° BL]
10.2 VENTE CARBURANT — SHIFT
Règles fondamentales :

PAS d'ouverture manuelle — clôture d'un shift ouvre automatiquement le suivant
Index initial shift N+1 = index final shift N (automatique, non modifiable)
C'est un supérieur hiérarchique (autre session) qui clôture le shift du pompiste
Le pompiste est le titulaire du shift

Interface de clôture :

Station + Pompiste + Pistolet(s)
Index final saisi → Index initial affiché automatiquement
Volume = Index final − Index initial (auto)
CA par produit = Volume × Prix de vente paramétré (auto)
Section paiements : Espèces, Chèque, Notes de crédit, Mobile Money, Crédit client (avec échéance)
Écart non justifié → attribué automatiquement au 460-xxx du pompiste

Flux stock — Mouvementer stock :
→ Sortie stock : −Volume vendu par cuve
→ Compte : 310/320/330
→ CMUP maintenu (pas de recalcul à la sortie)
→ Jauge cuve mise à jour
→ Index pistolet mis à jour (devient index initial du shift suivant)
→ Mouvement : type "sortie_vente", N° shift, date, volume, CMUP
Flux comptable — Comptabiliser :
DÉBIT  : 512/513/514/530-xxx (selon mode paiement)
DÉBIT  : 411-xxx (si crédit client)
DÉBIT  : 460-xxx pompiste (si manquant non justifié)
CRÉDIT : 7071/7072/7073 (Ventes selon type carburant, tagué station)

Coût des ventes :
DÉBIT  : 6031/6032/6033 (CAMV selon type carburant)
CRÉDIT : 310/320/330 (Stock × CMUP)
Le Voir Détails imprimable = document officiel du shift (index, volumes, CA, paiements, écarts)
10.3 ACHAT BOUTIQUE

Liste des achats + bouton "Nouvel achat"
Date, Station, Fournisseur (ou "Non défini"), Articles + Prix d'achat manuel
3 modes : Cash total / Crédit total (avec échéance) / Mixte
Fournisseur "Non défini" → cash automatique, écriture directe sans compte tiers
Lubrifiants avec fournisseur partenaire → compte 401 commun carburant + lubrifiants
Fournisseurs non-partenaire → facture soldée à 0 obligatoirement

Flux stock — Mouvementer stock :
→ Entrée stock : +Quantité par article
→ Compte : 340/350/360/370 selon famille
→ CMUP recalculé
→ Mouvement : type "entree_achat", date, N° facture
Flux comptable — Comptabiliser :
Cash total :
DÉBIT  : 340/350/360/370 (Stock selon famille)
CRÉDIT : 512/513/530-xxx (Trésorerie)

Crédit total :
DÉBIT  : 340/350/360/370
CRÉDIT : 401-xxx → apparaît dans Règlement dettes avec échéance

Mixte :
DÉBIT  : 340/350/360/370
CRÉDIT : Trésorerie (cash) + 401-xxx (crédit)

Fournisseur Non défini :
DÉBIT  : 340/350/360/370
CRÉDIT : Trésorerie (écriture directe)
10.4 VENTE BOUTIQUE & SERVICES — POS
Interface caisse décentralisée :

Layout : catalogue produits (gauche 60%) + ticket de caisse (droite 40%)
Catalogue : recherche temps réel + filtres catégories + scan code-barres (caméra ou scanner USB)
Seuls les articles/services cochés à la création de la station sont visibles
Services intégrés comme catégorie dans le POS (pas de stock)

Sessions :

La même session ouvre ET clôture son shift boutique (vendeuse titulaire)
≠ carburant où c'est un supérieur qui clôture

Temporalité des mises à jour :

Stock → mis à jour en temps réel à chaque vente
Trésorerie → mise à jour en temps réel à chaque paiement
Tickets individuels → enregistrés et numérotés en temps réel
Comptabilisation → groupée à la clôture shift par un responsable autorisé

Flux stock (temps réel à chaque vente) :
→ Sortie stock : −Quantité vendue
→ Compte : 340/350/360/370 selon famille
→ CMUP maintenu
→ Alerte si stock ≤ seuil
→ Mouvement : type "sortie_vente_boutique", N° ticket, date/heure
Flux comptable (à la clôture shift) :
Ventes (écriture groupée) :
DÉBIT  : 530/512/513-xxx (trésorerie selon mode)
DÉBIT  : 411-xxx (crédit client)
DÉBIT  : 460-xxx vendeuse (écart caisse non justifié)
CRÉDIT : 7074/7075/7076/7077 (selon famille, tagué station)
CRÉDIT : 7061/7062/7063/7069 (services, tagué station)

Coût des ventes :
DÉBIT  : 6034/6035/6036/6037 (CAMV selon famille)
CRÉDIT : 340/350/360/370 (Stock × CMUP)
10.5 TRANSFERT DE STOCK

Entre stations de la même entreprise uniquement
Valorisation = CMUP station d'origine
Pas d'écriture comptable générée
Sorties stock station A + Entrée stock station B + CMUP B recalculé

10.6 INVENTAIRE CARBURANT
Calcul automatique :
Stock initial = Stock réel dernier inventaire validé
+ Achats livrés mouvementés depuis dernier inventaire
− Ventes mouvementées depuis dernier inventaire
= Stock théorique
Saisie jauge réelle → Volume réel (via calibrage)
Écart = Volume réel − Stock théorique
Action Régulariser (droits paramétrables par le gérant) — double effet simultané :
Flux stock :
→ Mouvement : type "regularisation_inventaire", écart, motif
→ Stock ajusté au volume réel
Flux comptable selon motif (obligatoire) :
Écart justifié (perte normale) :
DÉBIT  : 651 (Écarts négatifs carburants)
CRÉDIT : 310/320/330 (Stock × CMUP)

Excédent :
DÉBIT  : 310/320/330
CRÉDIT : 751 (Écarts positifs carburants)

Écart infondé / manquant livraison :
DÉBIT  : 460-xxx (Responsable désigné)
CRÉDIT : 310/320/330 (Stock × CMUP)
10.7 INVENTAIRE BOUTIQUE

Même logique qu'inventaire carburant
Saisie quantité physique par article (pas de jauge)
Motif obligatoire : Périmé / Cassé / Perte / Autre

Flux comptable :
Écart justifié :
DÉBIT  : 652 (Écarts négatifs articles boutique)
CRÉDIT : 340/350/360/370 (Stock × CMUP)

Excédent :
DÉBIT  : 340/350/360/370
CRÉDIT : 752 (Écarts positifs articles boutique)

Infondé :
DÉBIT  : 460-xxx
CRÉDIT : 340/350/360/370
10.8 OPÉRATIONS HORS ACHAT & VENTE
Règle universelle : Interface guidée par type. Comptes pré-définis. Partie double vérifiée avant toute validation (∑ Débits = ∑ Crédits — sinon BLOQUÉ).
Tri créances/dettes : Par échéance croissante — Rouge (dépassé), Orange (< 7j), Vert (normal)
Virement Interne
DÉBIT  : Trésorerie entrante
CRÉDIT : Trésorerie sortante
Encaissement Créances

Créances clients (411-xxx) + Créances employés (460-xxx)
Référence obligatoire (N° facture ou N° shift)
Paiement partiel accepté, solde reste visible avec historique

DÉBIT  : Trésorerie
CRÉDIT : 411-xxx ou 460-xxx
Règlement Dettes

Partenaire carburant/lubrifiant : solde global (pas par facture)
Autres fournisseurs : soldé à 0 obligatoirement
Référence obligatoire

DÉBIT  : 401-xxx
CRÉDIT : Trésorerie
Charges Courantes

Date + Libellé + Station/Central (analytique) + Compte 6xxx + Fournisseur (ou "Non défini")
3 modes : Cash total / Crédit total / Mixte
Fournisseur "Non défini" → cash automatique, écriture directe
Partie crédit → apparaît dans Règlement dettes avec échéance

Salaires — 3 étapes distinctes
Étape 1 — Avance (au 15) :
DÉBIT  : 421-xxx (par salarié)
CRÉDIT : Trésorerie

Étape 2 — Constatation (fin mois) :
DÉBIT  : 640 (montant net global)
CRÉDIT : 421-xxx (par salarié)

Étape 3 — Paiement net restant :
DÉBIT  : 421-xxx
CRÉDIT : Trésorerie → Solde 421 = 0
Charges Fiscales & Sociales
CNAPS  : DÉBIT 631 / CRÉDIT 431 → Règlement dettes
OSTIE  : DÉBIT 631 / CRÉDIT 432 → Règlement dettes
IRSA   : DÉBIT 631 / CRÉDIT 447 → Règlement dettes
TVA    : DÉBIT 631 / CRÉDIT 4454 → Règlement dettes
IR     : DÉBIT 690 / CRÉDIT 444 → Règlement dettes
(Tout en TTC — TVA traitée comme charge)
Opérations du Gérant
Capital Apport    : DÉBIT Trésorerie / CRÉDIT 101
Capital Retrait   : DÉBIT 101 / CRÉDIT Trésorerie
CC Apport         : DÉBIT Trésorerie / CRÉDIT 455
CC Retrait        : DÉBIT 455 / CRÉDIT Trésorerie
Dividendes Affectation : DÉBIT 120 / CRÉDIT 457 (pas de trésorerie)
Dividendes Distribution: DÉBIT 457 / CRÉDIT Trésorerie
Immobilisations
Acquisition Cash :
DÉBIT  : 2xxx / CRÉDIT : Trésorerie

Acquisition Crédit :
DÉBIT  : 2xxx / CRÉDIT : 401-xxx → Règlement dettes

Cession Perte (prix vente < valeur acq.) :
DÉBIT  : Trésorerie + DÉBIT 653 / CRÉDIT : 2xxx

Cession Bénéfice (prix vente > valeur acq.) :
DÉBIT  : Trésorerie / CRÉDIT : 2xxx + CRÉDIT 753

Pas de gestion d'amortissement.
10.9 DOLÉANCES
Workflow Station → Partenaire :

Station crée incident → Type (Panne pistolet / Eau dans cuve / Panne électrique / Problème livraison / Autre) + Description
Notification Supabase Realtime immédiate au Territory Manager
Territory Manager clique "Bien reçu" → notification retour station
Station clique "Problème réglé" → clôture + calcul délais

Statuts : Envoyée 🔴 / Prise en charge 🟡 / Réglée 🟢
Statistiques automatiques :

Délai moyen accusé réception par Territory Manager
Délai moyen résolution par station
Types incidents les plus fréquents


11. DASHBOARD GÉRANT — ACCÈS EXCLUSIF GÉRANT
Capitaux propres nets (temps réel) :
101 (Capital) + 120 (Résultat net YTD) = Capitaux propres nets
KPIs : CA du mois, Trésorerie totale, Marge brute, Shifts du mois
Graphiques recharts : CA journalier (barres), Réalisations vs objectifs (barres horizontales %), Trésorerie par compte (jauges), KPI boutique CA + % objectif
Alertes : Stocks sous seuil (triés urgence), Échéances proches J-3/J-7, Écarts carburant non régularisés, Doléances en attente

12. INTERFACE PARTENAIRE OFFICIEL
Dashboard

Volume carburant total réseau (pas de CA carburant)
% réalisation objectif réseau
Nombre doléances ouvertes
CA boutique réseau + % objectif
Graphiques : performance par station (barres), écarts carburant (courbe), réalisations vs objectifs

Nos Stations

Liste toutes stations du réseau avec statut
Stations en attente de validation → bouton Valider
Vue détaillée par station (volumes, stocks, achats, écarts)
Filtrage par Territory Manager / zone

Doléances

Liste doléances reçues, triées par statut
Bouton "Bien reçu"
Statistiques délais par Territory Manager

Rapports (données opérationnelles uniquement — jamais financières)

Volumes vendus, stocks, achats, écarts carburant réseau
Réalisations vs objectifs par station
Comparatif performance inter-stations
Statistiques doléances

Sessions Utilisateurs

Admin partenaire → voit tout le réseau
Territory Manager → filtré par zone géographique
Droits granulaires par session


13. RAPPORTS
Règles communes : Imprimable PDF + Exportable Excel. Filtres : Période + Station.
4 types de présentation : Tableau chiffré / Tableau comparatif / Tableau cumulatif / Fiche détaillée
Rapports Financiers & Comptables (Gérant)

Grand Livre — par compte, par période
Balance générale
Bilan à une date donnée
Compte de résultat — global ou par station (analytique)
Tableau de trésorerie
Balance âgée fournisseurs
Balance âgée clients
Situation comptes 460 par employé

Rapports Commerciaux & Ventes

CA journalier/mensuel/annuel par station
CA par produit/famille/catégorie
CA par pompiste/vendeuse/shift
Comparatif N vs N-1
Réalisations vs objectifs (volume carburant + CA boutique)
Top articles vendus / moins vendus
Situation créances clients en cours
Rapport des shifts carburant (index, volumes, CA, paiements, écarts)
Marge brute par produit/station

Rapports Stocks

État des stocks valorisés CMUP à date
Mouvements de stock par article/période
Historique inventaires et écarts
Articles sous seuil d'alerte / en rupture
Articles à faible rotation
Évolution prix d'achat par article
Rapport écarts carburant par station
Suivi cuves — historique jauges


14. RÈGLES MÉTIER CRITIQUES — NE JAMAIS DÉVIER

Numéros de comptes invisibles en frontend partout sauf Grand Livre/Balance
Partie double obligatoire et bloquante : ∑ Débits = ∑ Crédits
CMUP seule méthode de valorisation — calculé via trigger SQL calculer_cmup()
Jauge → Volume : toujours via get_volume_from_jauge() (interpolation linéaire calibrages)
Shifts carburant : PAS d'ouverture manuelle — clôture auto ouvre le suivant
Index pistolet : initial = final shift précédent, non modifiable
Clôture shift carburant : par supérieur hiérarchique (autre session)
POS boutique : même session ouvre et clôture
Stock boutique : mis à jour en temps réel à chaque vente
Comptabilisation boutique : groupée à la clôture shift
Prix carburant historisé : changement = nouvel enregistrement daté, passé conservé
Mouvementer avant Comptabiliser : bouton Comptabiliser grisé sans mouventation préalable
Valider Initialisation : irréversible, verrouille définitivement la page
Facture boutique non-partenaire : soldée à 0 obligatoirement
460 Responsabilité opérationnelle : tout écart non justifié → 460-xxx de l'employé auto
Partenaire : jamais de données financières (CA carburant, marges, trésorerie, comptabilité)
Calibrage cuves : 3 règles strictes (jauge max ≥ capacité, volumes croissants, pas de doublons)
Import calibrage : autocomplétion même avec erreurs, signaler les points non conformes
Boutique/Services : seuls les éléments cochés à la création station sont visibles dans le POS
Sessions : droits granulaires par poste, page Utilisateurs obligatoire pour chaque type de compte


15. BASE DE DONNÉES

Référence : /scripts/reborn.sql — toujours consulter pour les dernières modifications
Toute logique métier critique en SQL (fonctions, triggers) — pas en JavaScript
Transactions obligatoires pour opérations multi-tables (ACID)
RLS strict sur toutes les tables sensibles
Erreurs RLS anticipées et corrigées avant déploiement
Fonctions SQL clés : get_volume_from_jauge(), calculer_cmup(), verifier_partie_double(), generer_numero_tiers(), generer_numero_tresorerie()


16. TESTS — OBLIGATOIRES
Tests à lancer à chaque fin de session et corriger avant de passer à la suite :

Tests unitaires (Vitest) : logique métier isolée
Tests E2E (Playwright) : flux utilisateur complets
Linting ESLint : 0 erreur
TypeScript tsc --noEmit : 0 erreur
Build npm run build : doit réussir

Base de données mockée pour tous les tests (ne pas toucher la production).
Pour chaque fonctionnalité :

Happy path (cas nominal)
Error path (cas d'erreur)
Valeurs correctes et incorrectes
Composants UI, logique métier, RLS, notifications/toasts, états de chargement

Processus de validation manuelle :

Tests automatisés passent → demander si test manuel souhaité
Si OUI → indiquer URL, données de test, étapes, résultats attendus
Si test invalide → analyser logs, corriger, re-tester
Si test validé → passer au design


17. FICHIERS DE SUIVI DU PROJET

GUIDE/actions.md : historique de toutes les actions effectuées depuis le début du projet
GUIDE/demandes.md : historique de tous les prompts lancés
GUIDE/plan-execution.md : modifié uniquement si ce document est modifié
GUIDE/rules.md : transcription exacte des règles de ce document — modifié uniquement si ce document est modifié
todo.md (racine) : toujours mis à jour à chaque tâche terminée
Ne plus faire d'audit de l'application si ce document est à jour


18. NOTES IMPORTANTES

Pas de code dupliqué, nommage explicite, gestion des erreurs complète
Performance : chargement pages et requêtes ≤ 1 seconde
Supabase Realtime : UNIQUEMENT pour ventes live et mises à jour critiques (ne pas surcharger)
Vercel Analytics (gratuit) pour monitoring
Ne jamais improviser la logique métier — toujours suivre ce document
Cohérence > Rapidité
Les SQL créés se trouvent dans /scripts — toujours référencer reborn.sql