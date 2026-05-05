---
description: APEX — Implémenter le système de droits granulaires (UserPermissionsModal) pour les sessions gérant (page par page, fonctionnalité par fonctionnalité)
argument-hint: <aucun — lancer directement>
---

<objective>
Selon §2 du Guide Document "Sessions Utilisateurs — RÈGLE CRITIQUE" :
"Droits granulaires page par page et fonctionnalité par fonctionnalité (pas par rôle hiérarchique)"
La page ManagerUsersPage.tsx (5.7k) existe mais est probablement basique.
Le dossier src/components/manager/permissions/ est VIDE.
Implémenter le système complet de droits granulaires pour les sessions créées par le gérant.
Exemple : comptable et chef de piste au même niveau hiérarchique mais accès pages totalement différents.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §2 "TYPES DE COMPTES & SESSIONS" (règle droits granulaires)
- guide/Guide_Document_SuccessFuel.md §6 "AUTH & REDIRECTIONS" (sessions employés)
- src/components/manager/ManagerUsersPage.tsx (page actuelle à enrichir)
- src/app/(manager)/manager/users/ (route existante)
- src/types/supabase.ts (tables : comptes, sessions ou permissions)
- src/hooks/useAuth.ts (comment les permissions sont vérifiées)

Pages manager (droits possibles à accorder/refuser) :
- /manager/dashboard (lecture seule pour sessions employés)
- /manager/structure/* (plan comptable, tiers, articles, trésorerie, camions, objectifs, services)
- /manager/initialisation (gérant uniquement — jamais pour sessions)
- /manager/traitement/achat-carburant (lecture / écriture BC / Mouvementer / Comptabiliser)
- /manager/traitement/vente-carburant (lecture / clôturer shift)
- /manager/traitement/achat-boutique (lecture / écriture)
- /manager/traitement/vente-boutique (POS complet / lecture seule)
- /manager/traitement/inventaire (lecture / régulariser)
- /manager/traitement/operations (par type d'opération)
- /manager/traitement/transfert-stock (lecture / écriture)
- /manager/traitement/doleances (créer / voir)
- /manager/rapports/* (chaque rapport séparément)
- /manager/stations (lecture seule)
- /manager/users (JAMAIS pour sessions — gérant uniquement)
- /manager/parametres (JAMAIS pour sessions — gérant uniquement)
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire ManagerUsersPage.tsx en entier pour comprendre la gestion actuelle des sessions
2. Vérifier dans supabase.ts la structure des tables comptes et sessions (ou permissions)
3. Lire useAuth.ts et authStore pour comprendre comment les permissions sont consommées
4. Vérifier comment les pages manager protègent l'accès (useAuthStore, role, permissions)
5. Identifier si une table permissions granulaires existe dans la DB

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/manager/permissions/
├── UserPermissionsModal.tsx      # Dialog configuration droits
├── PermissionToggle.tsx          # Switch toggle pour un droit
└── PermissionSection.tsx         # Section groupée (ex: Traitement, Rapports)
```

Structure des permissions (définir une constante) :
```typescript
// src/lib/permissions.ts
export const MANAGER_PERMISSIONS = {
  dashboard: { label: 'Dashboard', description: 'Voir le tableau de bord' },
  structure_view: { label: 'Structure — Consulter', ... },
  traitement_achat_carburant_view: { label: 'Achat carburant — Voir', ... },
  traitement_achat_carburant_write: { label: 'Achat carburant — Créer BC', ... },
  traitement_achat_carburant_mouvementer: { label: 'Achat carburant — Mouvementer', ... },
  traitement_achat_carburant_comptabiliser: { label: 'Achat carburant — Comptabiliser', ... },
  traitement_vente_carburant_view: { ... },
  traitement_vente_carburant_cloture: { label: 'Vente carburant — Clôturer shift', ... },
  traitement_boutique_pos: { label: 'POS Boutique — Opérer la caisse', ... },
  traitement_inventaire_view: { ... },
  traitement_inventaire_regulariser: { label: 'Inventaire — Régulariser', ... },
  traitement_operations: { label: 'Opérations hors vente', ... },
  rapports_financiers: { label: 'Rapports financiers (Bilan, CR)', ... },
  rapports_commerciaux: { label: 'Rapports commerciaux', ... },
  rapports_stocks: { label: 'Rapports stocks', ... },
  doleances: { label: 'Doléances', ... },
} as const
```

Fichiers à modifier :
- src/components/manager/ManagerUsersPage.tsx — intégrer UserPermissionsModal
- src/hooks/useAuth.ts — exposer une fonction hasPermission(permKey)
- Pages sensibles — vérifier hasPermission avant d'afficher les boutons critiques

## ÉTAPE 3 — EXECUTE
1. Créer src/lib/permissions.ts avec toutes les définitions
2. Créer PermissionToggle.tsx (Switch shadcn/ui + label + description)
3. Créer PermissionSection.tsx (grouper les toggles par catégorie)
4. Créer UserPermissionsModal.tsx :
   - Dialog avec Tabs (Traitement / Rapports / Structure / Autres)
   - Pour chaque permission : PermissionToggle
   - Boutons Annuler / Enregistrer
   - useMutation pour sauvegarder en DB
5. Modifier ManagerUsersPage.tsx :
   - Bouton "Configurer droits" sur chaque session → ouvre UserPermissionsModal
   - Afficher un résumé des droits accordés (N droits actifs sur N total)
6. Modifier useAuth.ts :
   - Charger les permissions depuis DB à la connexion
   - hasPermission(key): boolean
7. Protéger les boutons critiques dans les pages (ex: "Comptabiliser" visible seulement si hasPermission('traitement_achat_carburant_comptabiliser'))

## ÉTAPE 4 — VALIDATE
- [ ] UserPermissionsModal affiche toutes les permissions groupées
- [ ] Sauvegarder les permissions persiste en DB
- [ ] hasPermission() bloque l'accès aux boutons non autorisés
- [ ] Un employé sans droit "Clôturer shift" ne voit pas le bouton de clôture
- [ ] /manager/initialisation inaccessible aux sessions employés (toujours)
- [ ] /manager/users inaccessible aux sessions employés (toujours)
- [ ] TypeScript strict 0 erreur
- [ ] Test unitaire : hasPermission() retourne false si permission absente
</process>

<rules>
- Les pages Initialisation et Utilisateurs sont TOUJOURS réservées au gérant — jamais accessibles aux sessions
- Un employé ne peut PAS s'attribuer des droits lui-même
- Les droits sont vérifiés en frontend (UX) ET vérifiés via RLS Supabase (sécurité)
- Pas de rôles hiérarchiques — UNIQUEMENT des droits page/fonctionnalité
- Le gérant peut retirer tous les droits d'une session — la session peut toujours se connecter mais ne verra aucune page
- Toujours afficher l'accès refusé (not-found ou unauthorized) si un employé tente d'accéder à une URL directement
</rules>
