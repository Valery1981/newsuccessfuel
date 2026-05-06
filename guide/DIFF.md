# DIFF — Différences avec Guide_Document_SuccessFuel.md

> **Date de création** : 2024-05-06
> **Version Guide de référence** : Guide_Document_SuccessFuel.md
> **Objectif** : Documenter toutes les nouvelles demandes qui diffèrent ou sont nouvelles par rapport aux règles, principes, logique et fonctionnalités du Guide_Document_SuccessFuel.md

---

## Introduction

Ce fichier documente les modifications demandées par le client qui changent les principes, règles et logique posés dans le Guide_Document_SuccessFuel.md. Toutes ces modifications s'appliquent principalement côté `src/app/(partner)/partner` (interface partenaire), sauf dans le cas où ce sont des fonctionnalités côté `src/components/manager/noperations/Gerant` qui affectent `src/components/partner` selon la logique métier.

---

## 1. NOUVEAUX KPI CARDS DASHBOARD PARTENAIRE

### 1.1 KPI Cards à ajouter dans le Dashboard Partenaire

Le dashboard partenaire doit afficher les KPI cards suivants (qui n'étaient pas spécifiés dans le Guide) :

#### KPI 1 : Total achat carburant par produit (depuis début du mois)
- **Description** : Afficher le volume total de carburant acheté par type de produit (SP95, SP91, GO, Pétrole) depuis le 1er du mois en cours
- **Période** : Du 1er du mois courant à aujourd'hui
- **Unité** : Litres
- **Produits concernés** : SP95, SP91, Gasoil (GO), Pétrole lampant
- **Source de données** : Table `achats_carburant` + `lignes_bc_carburant`
- **Calcul** : Somme des volumes reçus (quantité facturée) filtrée par date ≥ 1er du mois
- **Affichage** : Une card par type de carburant avec le volume total

#### KPI 2 : Total ventes par produit depuis début du mois
- **Description** : Afficher le volume total de carburant vendu par type de produit depuis le 1er du mois en cours
- **Période** : Du 1er du mois courant à aujourd'hui
- **Unité** : Litres
- **Produits concernés** : SP95, SP91, Gasoil (GO), Pétrole lampant
- **Source de données** : Table `shifts_carburant` + `lignes_shift_carburant`
- **Calcul** : Somme des volumes vendus (index final - index initial) filtrée par date ≥ 1er du mois
- **Affichage** : Une card par type de carburant avec le volume total

#### KPI 3 : Total Achat lubrifiants depuis début du mois
- **Description** : Afficher le volume total de lubrifiants achetés depuis le 1er du mois en cours
- **Période** : Du 1er du mois courant à aujourd'hui
- **Unité** : Litres ou unité selon le produit
- **Source de données** : Table `achats_boutique` + `lignes_achat_boutique` filtrée par famille "Lubrifiants"
- **Calcul** : Somme des quantités achetées filtrée par famille = "Lubrifiants" et date ≥ 1er du mois
- **Affichage** : Une card avec le volume total de lubrifiants

#### KPI 4 : Doléances ouvertes
- **Description** : Afficher le nombre de doléances actuellement ouvertes (statut "Envoyée" ou "Prise en charge")
- **Source de données** : Table `doleances`
- **Calcul** : COUNT(*) WHERE statut IN ('envoyee', 'prise_en_charge')
- **Affichage** : Une card avec le nombre de doléances ouvertes
- **Code couleur** : Orange si > 0, Vert si = 0

---

## 2. NIVEAU DE STOCK PAR STATION PAR PRODUIT AVEC SEUIL ALERTE

### 2.1 Nouvelle fonctionnalité : Vue détaillée des stocks par station

Le dashboard partenaire doit inclure une section affichant le niveau de stock actuel pour chaque station et chaque produit de carburant, avec indication visuelle si le stock est sous le seuil d'alerte.

#### Spécifications
- **Affichage** : Tableau avec les colonnes suivantes :
  - Nom de la station
  - Type de carburant (SP95, SP91, GO, Pétrole)
  - Stock actuel (litres)
  - Seuil d'alerte (litres)
  - Capacité maximale (litres)
  - % de remplissage
  - Statut (OK / Alerte)

- **Indicateur visuel d'alerte** :
  - Si stock actuel ≤ seuil d'alerte : afficher en ROUGE avec icône ⚠️
  - Si stock actuel > seuil d'alerte : afficher en VERT avec icône ✓

- **Source de données** :
  - Table `cuves` pour stock_actuel_litres, capacite_max, seuil_alerte
  - Table `stations` pour nom de la station
  - Table `stations` pour vérifier que la station appartient au réseau du partenaire

- **Calcul du % de remplissage** : (stock_actuel_litres / capacite_max) × 100

- **Filtre** : Uniquement les stations validées du réseau du partenaire connecté

---

## 3. RÉALISATION VS OBJECTIF PAR STATION ET PROJECTION FIN DU MOIS

### 3.1 Nouvelle fonctionnalité : Suivi des réalisations vs objectifs

Le dashboard partenaire doit afficher pour chaque station :
- La réalisation actuelle (volume vendu depuis début du mois)
- L'objectif mensuel (volume cible)
- Le % de réalisation
- Une projection de la réalisation à la fin du mois

#### Spécifications
- **Affichage** : Tableau avec les colonnes suivantes :
  - Nom de la station
  - Type de carburant
  - Réalisation actuelle (litres) - depuis 1er du mois
  - Objectif mensuel (litres)
  - % de réalisation (réalisation / objectif × 100)
  - Projection fin de mois (litres)
  - Écart vs objectif (projection - objectif)

- **Calcul de la projection** :
  - Jours écoulés ce mois : date actuelle - 1er du mois
  - Jours restants ce mois : dernier jour du mois - date actuelle
  - Vitesse journalière moyenne : réalisation actuelle / jours écoulés
  - Projection fin de mois : réalisation actuelle + (vitesse journalière × jours restants)

- **Indicateur visuel** :
  - Si % réalisation ≥ 100% : VERT
  - Si % réalisation entre 80% et 99% : ORANGE
  - Si % réalisation < 80% : ROUGE

- **Source de données** :
  - Table `objectifs` pour les objectifs mensuels par station et produit
  - Table `shifts_carburant` + `lignes_shift_carburant` pour les réalisations

---

## 4. RÉALISATION VS OBJECTIF ANNUEL

### 4.1 Nouvelle fonctionnalité : Suivi annuel des réalisations

Le dashboard partenaire doit afficher pour chaque station :
- La réalisation annuelle cumulée (volume vendu depuis 1er janvier)
- L'objectif annuel (volume cible)
- Le % de réalisation annuel

#### Spécifications
- **Affichage** : Tableau avec les colonnes suivantes :
  - Nom de la station
  - Type de carburant
  - Réalisation annuelle (litres) - depuis 1er janvier
  - Objectif annuel (litres)
  - % de réalisation annuel
  - Projection annuelle (basée sur la vitesse actuelle)

- **Calcul de la projection annuelle** :
  - Jours écoulés cette année : date actuelle - 1er janvier
  - Jours restants cette année : 31 décembre - date actuelle
  - Vitesse journalière moyenne : réalisation annuelle / jours écoulés
  - Projection annuelle : réalisation annuelle + (vitesse journalière × jours restants)

- **Indicateur visuel** : Même code couleur que mensuel (Vert ≥ 100%, Orange 80-99%, Rouge < 80%)

- **Source de données** :
  - Table `objectifs` pour les objectifs annuels par station et produit
  - Table `shifts_carburant` + `lignes_shift_carburant` pour les réalisations annuelles

---

## 5. NIVEAU ÉCARTS STATION

### 5.1 Nouvelle fonctionnalité : Suivi des écarts de stock par station

Le dashboard partenaire doit afficher le niveau des écarts de carburant pour chaque station.

#### Spécifications
- **Affichage** : Tableau avec les colonnes suivantes :
  - Nom de la station
  - Type de carburant
  - Écart total du mois (litres) - cumul des écarts depuis 1er du mois
  - Nombre d'écarts
  - Écart moyen (litres)
  - Tendance (amélioration / dégradation)

- **Calcul de l'écart** :
  - Source : Table `inventaires_carburant` colonne `ecart`
  - Écart total du mois : SUM(ecart) WHERE date_inventaire ≥ 1er du mois
  - Nombre d'écarts : COUNT(*) WHERE date_inventaire ≥ 1er du mois
  - Écart moyen : Écart total / Nombre d'écarts

- **Indicateur visuel** :
  - Écart positif (excédent) : VERT
  - Écart négatif (manquant) < 5% : ORANGE
  - Écart négatif (manquant) ≥ 5% : ROUGE

- **Source de données** :
  - Table `inventaires_carburant`
  - Table `stations` pour nom de la station

---

## 6. DOLÉANCES : STATISTIQUES AVANCÉES

### 6.1 Nouvelle fonctionnalité : Statistiques détaillées sur les doléances

Le dashboard partenaire doit afficher des statistiques avancées sur les doléances, incluant :
- Le nombre total de doléances
- Le délai moyen de traitement par Territory Manager (TM)
- Le délai moyen de traitement pour tout le réseau

#### Spécifications
- **Affichage** : Deux sections distinctes

**Section 1 : Vue globale réseau**
- Nombre total de doléances ce mois
- Délai moyen de traitement réseau (tous TM confondus)
- Délai moyen d'accusé de réception (TM → station)
- Délai moyen de résolution (station → clôture)

**Section 2 : Vue par Territory Manager**
- Pour chaque TM du réseau :
  - Nombre de doléances assignées
  - Délai moyen d'accusé de réception
  - Délai moyen de résolution
  - % de doléances résolues

- **Calcul des délais** :
  - Délai accusé réception : date_prise_en_charge - date_envoi
  - Délai résolution : date_cloture - date_prise_en_charge
  - Délai total : date_cloture - date_envoi

- **Unité** : Heures ou jours (configurable)

- **Source de données** :
  - Table `doleances`
  - Table `users` pour identifier les TM
  - Table `stations` pour la zone géographique

---

## 7. FILTRAGE PAR TERRITORY MANAGER (ZONE GÉOGRAPHIQUE)

### 7.1 Nouvelle fonctionnalité : Filtre par TM

Le dashboard partenaire doit permettre de filtrer toutes les données par Territory Manager (vue sur la zone géographique assignée).

#### Spécifications
- **Filtre global** : Un sélecteur en haut du dashboard permettant de choisir :
  - "Tout le réseau" (par défaut)
  - Un TM spécifique (liste déroulante des TM du partenaire)

- **Impact du filtre** :
  - KPI cards : Afficher uniquement les données des stations de la zone du TM sélectionné
  - Tableau stocks : Afficher uniquement les stations de la zone du TM
  - Tableau réalisations : Afficher uniquement les stations de la zone du TM
  - Tableau écarts : Afficher uniquement les stations de la zone du TM
  - Statistiques doléances : Afficher uniquement les doléances de la zone du TM

- **Source de données** :
  - Table `users` pour la liste des TM
  - Table `stations` avec colonne `zone_geographique` ou `tm_id`
  - Table `doleances` avec colonne `station_id`

---

## 8. DÉTAILS PAR STATION DANS LES RAPPORTS

### 8.1 Nouvelle fonctionnalité : Rapports détaillés par station

Les rapports partenaire doivent permettre de voir les détails par station. Le dashboard reste une vue générale, mais les rapports doivent contenir les détails complets.

#### Spécifications
- **Rapports concernés** :
  - Rapport volumes vendus par station
  - Rapport stocks par station
  - Rapport écarts par station
  - Rapport réalisations vs objectifs par station
  - Rapport doléances par station

- **Fonctionnalité** :
  - Chaque rapport doit avoir un filtre par station
  - Possibilité de sélectionner une ou plusieurs stations
  - Possibilité d'exporter le rapport pour une station spécifique

- **Affichage** :
  - Tableau détaillé avec toutes les données de la station sélectionnée
  - Graphiques spécifiques à la station
  - Historique temporel (évolution sur la période)

---

## 9. DATE DE DERNIÈRE MISE À JOUR PAR STATION

### 9.1 Nouvelle règle : Affichage systématique de la date de dernière mise à jour

Toutes les données affichées dans le dashboard et les rapports partenaire doivent indiquer la date de la dernière mise à jour pour chaque station.

#### Spécifications
- **Affichage** :
  - Dans chaque tableau de données : une colonne "Dernière mise à jour"
  - Dans chaque KPI card : une petite mention "Mis à jour le : JJ/MM/AAAA"

- **Dates à afficher** selon le type de données :
  - **Stocks** : Date du dernier inventaire validé pour la station
  - **Ventes** : Date du dernier shift clôturé pour la station
  - **Achats** : Date de la dernière réception de carburant pour la station
  - **Écarts** : Date du dernier inventaire avec écart pour la station
  - **Doléances** : Date de la dernière doléance pour la station
  - **Réalisations** : Date du dernier shift clôturé pour la station

- **Format** : JJ/MM/AAAA HH:MM (date et heure)

- **Source de données** :
  - Table `inventaires_carburant` pour dernière date d'inventaire
  - Table `shifts_carburant` pour dernière date de shift
  - Table `achats_carburant` pour dernière date de réception
  - Table `doleances` pour dernière date de doléance

- **Objectif** : Le partenaire doit savoir de quand datent les données pour chaque station, surtout pour l'évolution des écarts (il doit savoir quand a eu lieu le dernier inventaire).

---

## 10. CA BOUTIQUE : DANS LES RAPPORTS MAIS PAS DANS LE DASHBOARD

### 10.1 Nouvelle règle : CA boutique uniquement dans les rapports

Le chiffre d'affaires (CA) boutique ne doit PAS apparaître dans le dashboard partenaire, mais doit être disponible dans les rapports détaillés.

#### Spécifications
- **Dashboard** :
  - NE PAS afficher le CA boutique dans les KPI cards du dashboard
  - NE PAS afficher le CA boutique dans les graphiques du dashboard

- **Rapports** :
  - Ajouter un rapport spécifique "CA Boutique par Station"
  - Ce rapport doit afficher :
    - CA boutique total par station depuis début du mois
    - CA boutique par famille de produits
    - CA boutique par article (top articles)
    - Évolution du CA boutique sur la période
    - Réalisation vs objectif CA boutique

- **Raison** : Le dashboard doit rester une vue générale synthétique, le CA boutique est un détail qui doit être consulté dans les rapports spécifiques.

---

## 11. RÉSUMÉ DES DIFFÉRENCES AVEC LE GUIDE

### 11.1 Ce qui change par rapport au Guide_Document_SuccessFuel.md

| Élément | Dans le Guide | Nouvelle demande | Type de changement |
|---------|---------------|------------------|-------------------|
| Dashboard partenaire KPI | Volume carburant total réseau, % réalisation, doléances ouvertes, CA boutique | + KPI achat carburant par produit, + KPI ventes par produit, + KPI achat lubrifiants | Ajout |
| Niveau de stock | Non spécifié dans dashboard partenaire | + Vue détaillée stock par station/produit avec seuil alerte | Ajout |
| Réalisation vs objectif | Mentionné mais pas détaillé | + Projection fin de mois, + Objectif annuel avec projection | Ajout |
| Écarts station | Non spécifié dans dashboard partenaire | + Niveau écarts par station avec tendance | Ajout |
| Doléances stats | Délai moyen accusé réception, délai moyen résolution | + Délai moyen par TM, + Vue par TM, + Filtre par TM | Ajout |
| Filtre TM | Non spécifié | + Filtre global par Territory Manager sur tout le dashboard | Ajout |
| Détails par station | "Vue détaillée par station" mentionnée | + Rapports détaillés par station avec filtres | Précision |
| Date mise à jour | Non spécifié | + Affichage systématique date dernière mise à jour par station | Ajout |
| CA boutique | Affiché dans dashboard partenaire | Retiré du dashboard, uniquement dans rapports | Modification |
| Rapports partenaire | Données opérationnelles uniquement | + Rapport CA boutique détaillé | Ajout |

### 11.2 Ce qui reste conforme au Guide

Les éléments suivants du Guide_Document_SuccessFuel.md restent applicables et ne changent pas :

- **Rôle partenaire** : Consultatif, accès aux données opérationnelles uniquement (pas de données financières)
- **Données visibles** : Volumes vendus (carburant), stocks, achats, réalisations vs objectifs, écarts stocks carburant, CA boutique (sans marges)
- **Données non visibles** : CA carburant, marges, données financières, données comptables, trésorerie détaillée, salaires, charges
- **Sessions employés** : Admin partenaire voit tout le réseau, Territory Manager filtré par zone géographique
- **Rapports** : Données opérationnelles uniquement, jamais financières
- **Validation stations** : Partenaire valide les stations de son réseau
- **Co-financement** : Partenaire co-finance une partie de l'abonnement des stations

---

## 12. IMPLÉMENTATION TECHNIQUE

### 12.1 Fichiers à créer/modifier

#### Côté Partner (`src/app/(partner)/partner`)

**Nouveaux composants à créer** :
- `src/components/partner/KPICards.tsx` - KPI cards (achats, ventes, lubrifiants, doléances)
- `src/components/partner/StockLevelTable.tsx` - Tableau niveau de stock par station/produit
- `src/components/partner/RealisationObjectiveTable.tsx` - Tableau réalisation vs objectif mensuel + projection
- `src/components/partner/AnnualRealisationTable.tsx` - Tableau réalisation vs objectif annuel
- `src/components/partner/EcartLevelTable.tsx` - Tableau niveau écarts par station
- `src/components/partner/DoleanceStats.tsx` - Statistiques doléances (global + par TM)
- `src/components/partner/TMFilter.tsx` - Filtre par Territory Manager
- `src/components/partner/LastUpdateBadge.tsx` - Badge date de dernière mise à jour

**Pages à modifier** :
- `src/app/(partner)/partner/dashboard/page.tsx` - Intégrer tous les nouveaux composants

**Nouvelles routes de rapports** :
- `src/app/(partner)/partner/rapports/ca-boutique/page.tsx` - Rapport CA boutique détaillé
- `src/app/(partner)/partner/rapports/stocks-station/page.tsx` - Rapport stocks par station
- `src/app/(partner)/partner/rapports/ecarts-station/page.tsx` - Rapport écarts par station
- `src/app/(partner)/partner/rapports/realisations-station/page.tsx` - Rapport réalisations par station

**Services à créer** :
- `src/services/partnerKPIService.ts` - Calcul des KPIs partenaire
- `src/services/partnerStockService.ts` - Données stocks par station
- `src/services/partnerRealisationService.ts` - Calculs réalisations + projections
- `src/services/partnerEcartService.ts` - Données écarts par station
- `src/services/partnerDoleanceService.ts` - Statistiques doléances par TM

#### Côté Manager (`src/components/manager/noperations/Gerant`)

Si des fonctionnalités côté manager affectent les données partenaire :
- Vérifier les services existants pour les données utilisées par le partenaire
- S'assurer que les dates de dernière mise à jour sont correctement enregistrées

### 12.2 Base de données

**Colonnes à vérifier/ajouter** :
- Table `stations` : Vérifier colonne `zone_geographique` ou `tm_id` pour le filtrage par TM
- Table `doleances` : Vérifier colonnes `date_envoi`, `date_prise_en_charge`, `date_cloture`
- Table `inventaires_carburant` : Vérifier colonne `date_inventaire`
- Table `shifts_carburant` : Vérifier colonne `date_shift`
- Table `achats_carburant` : Vérifier colonne `date_reception`

**Vues à créer** (si nécessaire) :
- `vue_kpi_partenaire` - Vue agrégée pour les KPIs partenaire
- `vue_stock_partenaire` - Vue stocks par station avec seuils
- `vue_realisation_partenaire` - Vue réalisations avec objectifs
- `vue_ecart_partenaire` - Vue écarts par station
- `vue_doleance_stats` - Vue statistiques doléances par TM

---

## 13. RÈGLES MÉTIER SPÉCIFIQUES AUX NOUVELLES FONCTIONNALITÉS

### 13.1 Règles de calcul des projections

**Projection fin de mois** :
- Formule : Réalisation actuelle + (Vitesse journalière × Jours restants)
- Vitesse journalière = Réalisation actuelle / Jours écoulés
- Si Jours écoulés = 0 (1er du mois), utiliser une vitesse journalière par défaut basée sur l'historique du même mois l'année précédente

**Projection annuelle** :
- Formule : Réalisation annuelle + (Vitesse journalière × Jours restants cette année)
- Vitesse journalière = Réalisation annuelle / Jours écoulés cette année
- Si Jours écoulés = 0 (1er janvier), utiliser une vitesse journalière par défaut basée sur l'année précédente

### 13.2 Règles d'affichage des dates de dernière mise à jour

**Priorité des dates** :
- Pour les stocks : Date du dernier inventaire validé (si aucun inventaire, afficher "Jamais inventorié")
- Pour les ventes : Date du dernier shift clôturé (si aucun shift, afficher "Aucune vente")
- Pour les achats : Date de la dernière réception (si aucune réception, afficher "Aucun achat")
- Pour les écarts : Date du dernier inventaire avec écart (si aucun écart, afficher "Aucun écart")
- Pour les doléances : Date de la dernière doléance (si aucune, afficher "Aucune doléance")

### 13.3 Règles de filtrage par Territory Manager

**Définition de la zone géographique** :
- Chaque station est assignée à un Territory Manager via la colonne `tm_id` ou `zone_geographique`
- Le filtre TM affiche uniquement les stations assignées au TM sélectionné
- L'admin partenaire peut voir toutes les zones (filtre "Tout le réseau")

**Impact sur les KPIs** :
- Lorsqu'un TM est sélectionné, tous les KPIs sont recalculés uniquement pour les stations de ce TM
- Les graphiques sont mis à jour en temps réel lors du changement de filtre

---

## 14. VALIDATION

### 14.1 Checklist de validation

- [ ] KPI cards affichent correctement les achats, ventes, lubrifiants, doléances
- [ ] Tableau niveau de stock affiche les stocks par station/produit avec seuils d'alerte
- [ ] Tableau réalisation vs objectif affiche les projections fin de mois
- [ ] Tableau réalisation annuelle affiche les projections annuelles
- [ ] Tableau écarts affiche les écarts par station avec tendance
- [ ] Statistiques doléances affichent les délais par TM et global
- [ ] Filtre TM fonctionne correctement sur toutes les données
- [ ] Rapports détaillés par station sont accessibles
- [ ] Date de dernière mise à jour est affichée pour chaque station
- [ ] CA boutique n'apparaît PAS dans le dashboard
- [ ] CA boutique apparaît dans les rapports détaillés
- [ ] Toutes les données sont filtrées par le réseau du partenaire connecté
- [ ] Les données financières (CA carburant, marges) ne sont PAS visibles

### 14.2 Tests à effectuer

- Test unitaire : Calcul des projections fin de mois
- Test unitaire : Calcul des projections annuelles
- Test unitaire : Calcul des délais moyens de doléances
- Test E2E : Navigation dashboard partenaire avec filtre TM
- Test E2E : Consultation rapport CA boutique
- Test E2E : Vérification absence CA boutique dans dashboard

---

## 15. CONCLUSION

Ce document DIFF.md contient toutes les nouvelles demandes du client qui diffèrent des règles, principes, logique et fonctionnalités du Guide_Document_SuccessFuel.md. Ces modifications s'appliquent principalement côté interface partenaire (`src/app/(partner)/partner`) et visent à enrichir le dashboard avec des KPIs détaillés, des statistiques avancées sur les doléances, et un meilleur suivi des stocks, réalisations et écarts par station.

Toutes ces nouvelles fonctionnalités respectent les règles fondamentales du Guide :
- Le partenaire ne voit PAS les données financières (CA carburant, marges, trésorerie, comptabilité)
- Le partenaire voit uniquement les données opérationnelles des stations de son réseau
- Les sessions employés (TM) sont filtrées par zone géographique
- Les rapports contiennent des données opérationnelles uniquement

La date de création de ce document est le 2024-05-06. Toute nouvelle demande devra être ajoutée à ce fichier avec la date de mise à jour correspondante.
