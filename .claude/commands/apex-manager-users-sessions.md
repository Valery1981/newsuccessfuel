---
description: APEX — Compléter la gestion des sessions gérant (ManagerUsersPage enrichi + flux first-login + reset mot de passe)
argument-hint: <aucun — lancer directement>
---

<objective>
ManagerUsersPage.tsx existe (5.7k) mais est basique selon le plan-execution.md.
Implémenter complètement la gestion des sessions employés pour le gérant :
- Créer une session avec email + mot de passe temporaire (must_change_password: true)
- Assigner des droits granulaires (lien avec apex-permissions-modal)
- Activer / Désactiver / Supprimer une session
- Flux first-login : l'employé doit changer son mot de passe à la première connexion
- Reset mot de passe par le gérant
La page /auth/first-login existe déjà dans (auth)/ — vérifier son état.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §2 "Sessions Utilisateurs — RÈGLE CRITIQUE"
- src/components/manager/ManagerUsersPage.tsx (état actuel)
- src/app/(auth)/ (pages auth existantes — vérifier first-login)
- src/hooks/useAuth.ts (gestion session utilisateur)
- src/services/authService.ts (création de comptes)
- src/services/adminService.ts (12.4k — logique création users admin — à adapter)
- src/types/supabase.ts (table comptes : champ must_change_password)
- CLAUDE.md "State Management — Only entreprise is persisted in authStore — always refetch compte from DB to get the live must_change_password value"

Règles métier :
- Le gérant crée des sessions pour ses employés (pas d'inscription autonome)
- Chaque session = un compte dans la table comptes avec type='session_gerant'
- must_change_password = true à la création → déclenche le flow first-login
- Droits granulaires par page/fonctionnalité (voir apex-permissions-modal)
- Un employé n'est pas un gérant — il ne peut pas créer de sessions lui-même
- La page Utilisateurs est visible UNIQUEMENT pour le gérant (pas pour les sessions)
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire ManagerUsersPage.tsx en entier — état exact (liste basique ou déjà avancé ?)
2. Lire src/app/(auth)/ pour trouver la page first-login et comprendre son état
3. Lire authService.ts pour comprendre la création de comptes
4. Lire CLAUDE.md note sur must_change_password (refetch depuis DB)
5. Vérifier la table comptes dans supabase.ts (champs must_change_password, is_active, station_id)

## ÉTAPE 2 — PLAN
Fichiers à enrichir/créer :
```
src/components/manager/
└── ManagerUsersPage.tsx       # Enrichir : création, droits, activation, reset

src/components/auth/
└── FirstLoginPage.tsx         # Vérifier si existe — sinon créer

src/app/(auth)/first-login/
└── page.tsx                   # Route first-login (vérifier si existe)
```

Fonctionnalités de ManagerUsersPage.tsx :
- Liste sessions avec : Nom, Email, Poste/Rôle (libre), Statut (Actif/Inactif)
- Badge "Doit changer son mot de passe" si must_change_password=true
- Actions : Modifier, Configurer droits, Désactiver/Activer, Réinitialiser mot de passe, Supprimer
- Dialog "Nouvelle session" :
  - Nom, Email, Poste (champ libre)
  - Mot de passe temporaire (visible ou généré automatiquement)
  - must_change_password: true par défaut
  - Sélecteur station(s) accessible(s) (si multi-stations)
- Dialog "Réinitialiser mot de passe" : nouveau mot de passe temporaire → must_change_password=true

## ÉTAPE 3 — EXECUTE
1. Enrichir ManagerUsersPage.tsx :
   - useQuery pour liste sessions de l'entreprise
   - useMutation pour créer/modifier/supprimer/désactiver
   - Dialog création avec react-hook-form + zod
   - Bouton "Configurer droits" → importer UserPermissionsModal (depuis apex-permissions-modal)
   - Badge rouge "Changement mdp requis" si must_change_password=true

2. Création de session (authService.ts) :
   ```typescript
   async function createSession(data: CreateSessionData) {
     // Créer user dans auth.users via admin client
     const { data: authUser } = await adminSupabase.auth.admin.createUser({
       email: data.email,
       password: data.motDePasseTemp,
       email_confirm: true
     })
     // Créer le compte dans table comptes
     await supabase.from('comptes').insert({
       user_id: authUser.user.id,
       type: 'session_gerant',
       entreprise_id: entrepriseId,
       must_change_password: true,
       is_active: true,
       nom: data.nom,
       poste: data.poste
     })
   }
   ```

3. Vérifier/créer FirstLoginPage.tsx :
   - Affichée automatiquement si must_change_password=true après connexion
   - Formulaire : nouveau mot de passe + confirmation
   - Validation force mot de passe (min 8 chars, majuscule, chiffre)
   - Après changement : must_change_password=false en DB → redirect vers dashboard

4. Vérifier middleware/hook qui intercepte must_change_password :
   - Dans useAuth.ts : après connexion, refetch compte depuis DB
   - Si must_change_password=true → redirect /first-login
   - Ne pas persister must_change_password dans le store (toujours refetch)

## ÉTAPE 4 — VALIDATE
- [ ] Créer une session → employé peut se connecter avec le mot de passe temporaire
- [ ] Première connexion → redirect automatique vers /first-login
- [ ] Changement mot de passe → must_change_password=false → redirect dashboard
- [ ] Désactiver une session → employé ne peut plus se connecter
- [ ] Réinitialiser mot de passe → must_change_password=true à nouveau
- [ ] Page Utilisateurs inaccessible pour les sessions employés
- [ ] TypeScript strict 0 erreur
- [ ] Test unitaire : vérification must_change_password flow
</process>

<rules>
- Utiliser le client admin (service_role) UNIQUEMENT côté serveur pour créer des users auth
- Ne JAMAIS exposer la service_role_key côté client
- must_change_password doit être vérifié à chaque connexion (refetch DB — jamais depuis le store local)
- Les sessions inactives (is_active=false) ne peuvent pas se connecter (vérifier via RLS ou middleware)
- Le gérant peut voir la liste de ses sessions mais PAS les mots de passe
- Mot de passe temporaire : minimum 12 caractères, généré aléatoirement si non saisi
</rules>
