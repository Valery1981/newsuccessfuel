---
description: APEX — Implémenter la page Utilisateurs/Sessions pour le partenaire (droits granulaires, Territory Manager filtré par zone)
argument-hint: <aucun — lancer directement>
---

<objective>
Il manque la page de gestion des sessions/utilisateurs pour le compte partenaire.
Selon le §2 du Guide Document, chaque type de compte (superadmin, gérant, partenaire) DOIT avoir une page Utilisateurs pour créer et gérer les sessions et leurs autorisations.
Spécificité partenaire :
- Admin partenaire → voit tout le réseau
- Territory Manager → filtré par zone géographique
- Droits granulaires page par page et fonctionnalité par fonctionnalité
La page manager/users existe (ManagerUsersPage.tsx 5.7k). La page partenaire /partner/users est ABSENTE.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §2 "SESSIONS UTILISATEURS — RÈGLE CRITIQUE"
- guide/Guide_Document_SuccessFuel.md §12 "INTERFACE PARTENAIRE — Sessions Utilisateurs"
- src/components/manager/ManagerUsersPage.tsx (modèle à adapter)
- src/components/admin/AdminUsersPage.tsx (autre modèle 26k)
- src/app/(partner)/partner/ (routes partner existantes)
- src/app/(partner)/layout.tsx (layout partenaire)
- src/types/supabase.ts (tables : comptes, sessions, permissions)
- src/services/adminService.ts (gestion users côté admin — réutiliser logique)

Règles métier :
- Le compte partenaire est admin de son propre espace
- Peut créer des sessions pour ses Territory Managers
- Chaque Territory Manager a une zone géographique assignée → filtre automatique des stations
- Droits granulaires : chaque page/fonctionnalité activable/désactivable
- Pages partenaire : Dashboard, Stations, Doléances, Rapports, Utilisateurs
- Un Territory Manager ne peut voir que ses stations (filtrées par zone) et les doléances associées
- Pas d'accès aux données financières pour aucune session partenaire
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire ManagerUsersPage.tsx en entier — comprendre la gestion des sessions gérant (pattern à réutiliser)
2. Lire AdminUsersPage.tsx — comprendre la gestion avancée des permissions
3. Inspecter src/app/(partner)/partner/ pour voir les pages partenaire existantes et le layout
4. Vérifier dans supabase.ts les tables sessions/comptes/permissions — identifier les colonnes zone_geographique
5. Vérifier partnerService.ts pour les queries existantes

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/partner/
└── PartnerUsersPage.tsx      # Page gestion sessions partenaire

src/app/(partner)/partner/
└── users/
    └── page.tsx              # Route /partner/users
```

Fichiers à modifier :
- src/app/(partner)/layout.tsx — ajouter lien "Utilisateurs" dans la sidebar partenaire

Structure PartnerUsersPage.tsx :
- Liste des sessions existantes (Territory Managers)
- Bouton "Créer une session"
- Par session :
  - Nom, Email, Zone géographique assignée
  - Droits : Dashboard (R), Stations (filtré par zone, R), Doléances (R+W), Rapports (R)
  - Actions : Modifier, Désactiver, Supprimer
- Modal création/édition avec :
  - Champs : Nom, Email, Mot de passe temporaire, Zone géographique (select multi-stations)
  - Droits granulaires par page (toggle switches)
  - must_change_password: true par défaut

## ÉTAPE 3 — EXECUTE
1. Créer PartnerUsersPage.tsx :
   - useQuery pour liste sessions du compte partenaire
   - useMutation pour créer/modifier/supprimer session
   - Dialog création avec formulaire (react-hook-form + zod)
   - Select zones géographiques (liste des régions/zones configurées)
   - Toggle switches pour droits par page
   - Badge statut : Actif / Inactif

2. Implémenter le filtrage Territory Manager :
   - Stocker zone_ids[] dans le profil session
   - Quand TM connecté : filtrer automatiquement stations et doléances par zone
   - Middleware/hook usePartnerSession() qui applique le filtre

3. Créer la route src/app/(partner)/partner/users/page.tsx

4. Ajouter "Utilisateurs" dans la sidebar partenaire (layout.tsx)

## ÉTAPE 4 — VALIDATE
- [ ] Admin partenaire peut créer/modifier/supprimer des sessions TM
- [ ] Territory Manager ne voit que ses stations (zone_id filtre correct)
- [ ] Territory Manager ne peut pas accéder aux données financières
- [ ] must_change_password déclenche le flow first-login
- [ ] Droits granulaires appliqués (page inaccessible si droit non accordé)
- [ ] Sidebar partenaire affiche le lien "Utilisateurs" uniquement pour l'admin partenaire
- [ ] TypeScript strict 0 erreur
- [ ] Test unitaire : vérifier logique filtrage zone géographique
</process>

<rules>
- Le partenaire (admin ou TM) ne voit JAMAIS les données financières (CA carburant, marges, trésorerie, comptabilité)
- Zone géographique = ensemble de stations assignées au TM (pas une région géographique abstraite)
- Les droits granulaires doivent correspondre aux pages du layout partenaire
- must_change_password = true à la création de toute nouvelle session
- Sécurité : vérifier côté Supabase (RLS) que le filtre zone n'est pas contournable côté client
</rules>
