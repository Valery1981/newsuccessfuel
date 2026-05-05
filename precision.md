# precision.md — Incohérences & Notes Techniques SuccessFuel
> Ce fichier est alimenté en continu pendant le développement. Chaque incohérence est documentée avec sa source, son impact, et sa résolution.

---

## INCOHÉRENCES DÉTECTÉES

### [CRITIQUE] INC-001 — ManagerNonSalesOperationsPage : 6/7 opérations non fonctionnelles
- **Fichier** : `src/components/manager/noperations/ManagerNonSalesOperationsPage.tsx`
- **Lignes** : 212-326
- **Symptôme** : 7 boutons d'opérations dans la grille, mais un seul `<Dialog>` implémenté (`dialogOpen === "virement"`). Les boutons "Charges Courantes", "Salaires", "Encaissement Créances", "Règlement Dettes", "Opérations Gérant", "Immobilisations" appellent `setDialogOpen(op.id)` mais aucun Dialog ne correspond → **clic silencieux, rien ne se passe**.
- **Impact** : Comptabilité mensuelle impossible (salaires, charges). Suivi tiers impossible (dettes, créances). Guide §10.8 non respecté.
- **Résolution** : Création de 6 composants Dialog dédiés + refactoring de la page principale. ✅ **CORRIGÉ** dans le SPRINT 1.1.

### [CRITIQUE] INC-002 — plan_comptable_entreprise vide
- **Fichier** : Table `plan_comptable_entreprise` (Supabase)
- **Symptôme** : La table est vide (0 lignes). La table `plan_comptable_standard` contient tous les comptes.
- **Cause probable** : La page Structure → Comptes n'a jamais été utilisée sur les comptes de test, OU la fonction de copie du plan standard vers l'entreprise n'est pas déclenchée.
- **Impact** : Toutes les opérations comptables qui fetche `plan_comptable_entreprise` obtiennent des listes vides. Les charges courantes ne peuvent pas être saisies sans compte à sélectionner.
- **Résolution appliquée** : Le `comptesService.ts` fait un fallback vers `plan_comptable_standard` quand `plan_comptable_entreprise` est vide.
- **Action recommandée** : Vérifier si la page Comptes dans Structure copie bien les comptes standards dans plan_comptable_entreprise à la création d'entreprise.

### [MOYENNE] INC-003 — ManagerDashboardPage : couleurs graphiques non conformes
- **Fichier** : `src/components/manager/ManagerDashboardPage.tsx:25`
- **Symptôme** : `COLORS = ["#10b981", "#3b82f6", ...]` — couleurs Tailwind génériques, pas les couleurs SuccessFuel.
- **Impact** : Guide §4 spécifie la palette `--or: #F5820A`, `--grn: #5BB544`, etc.
- **Résolution** : Ligne corrigée → `["#F5820A", "#5BB544", "#2B7CC1", "#F04444", "#F5A623", "#1B3D6F"]`. ✅ **CORRIGÉ**.

### [MOYENNE] INC-004 — ManagerUsersPage : pas de bouton "Créer" ni de gestion droits
- **Fichier** : `src/components/manager/ManagerUsersPage.tsx`
- **Symptôme** : La page affiche la liste des sessions mais n'a PAS de bouton "Créer une session". La colonne `droits` (jsonb) de `sessions_utilisateurs` n'est jamais affichée ni modifiée. Seule l'action "Désactiver" existe.
- **Impact** : Guide §14 exige "droits granulaires par poste". Impossible de créer de nouvelles sessions employés depuis l'interface. Le champ `droits` jsonb existe en DB mais est ignoré.
- **Résolution** : SPRINT 1.2a + 1.2b — création d'un dialog de création session + UserPermissionsModal.

### [MOYENNE] INC-005 — Clôture shift carburant : pas de vérification "supérieur hiérarchique"
- **Fichier** : `src/components/manager/fuel-sale/VenteCarburantPage.tsx`
- **Symptôme** : Le guide §14 exige "Clôture shift carburant : par supérieur hiérarchique (autre session)". Sans système de permissions, n'importe quelle session peut clôturer n'importe quel shift.
- **Impact** : Règle de séparation des responsabilités violée.
- **Résolution** : Sera traitée dans SPRINT 1.2b (UserPermissionsModal) — vérifier session role avant d'autoriser la clôture.

### [FAIBLE] INC-006 — Sessions employés : champ `droits` jsonb — format non standardisé
- **Table** : `sessions_utilisateurs.droits` (jsonb, nullable)
- **Symptôme** : Le format du jsonb `droits` n'est pas documenté. Il n'existe pas de type TypeScript pour ce champ.
- **Impact** : Sans schéma standardisé, chaque partie du code peut interpréter les droits différemment.
- **Résolution** : Définir un type `SessionDroits` dans `src/types/` qui liste toutes les pages/actions possibles avec des boolean flags.

### [FAIBLE] INC-007 — VirementInterne : numero_compte dans lignes_ecriture utilise tresoreries.numero_compte
- **Fichier** : `src/components/manager/noperations/ManagerNonSalesOperationsPage.tsx:159`
- **Symptôme** : `numero_compte: destAccount?.numero_compte ?? ""` — si tresorerie n'a pas de numero_compte, la ligne est vide.
- **Impact** : Lignes avec `numero_compte = ""` invalides pour le Grand Livre.
- **Résolution** : Ajouter une vérification que `tresorerie.numero_compte` n'est pas null avant de créer les lignes.

### [INFO] INC-008 — plan_comptable_standard : classe 455 et 457 classés en classe 1
- **Table** : `plan_comptable_standard`
- **Observation** : Les comptes 455 (Comptes courants associés) et 457 (Dividendes à distribuer) ont `classe = 1` mais sont dans la classe 4xx selon le PCG standard malgache.
- **Impact** : Si les requêtes filtrent par `classe = 4` pour les comptes de tiers, ces comptes seront exclus.
- **Note** : Pour les opérations gérant, ces comptes seront fetched directement par `numero` (pas par classe), donc pas d'impact fonctionnel.

### [INFO] INC-009 — Notifications table : types incluent stock_alerte et echeance_proche
- **Table** : `notifications.type` enum
- **Observation** : L'enum inclut `stock_alerte` et `echeance_proche` mais le Guide §14 dit "Supabase Realtime UNIQUEMENT pour doléances". Les autres types de notifications (stock, échéance) existent en DB mais ne doivent pas utiliser Realtime — ils doivent être des notifications passives (badge count recalculé au chargement).
- **Impact** : Si Realtime est activé pour ces types, cela surcharge Supabase.

---

## NOTES TECHNIQUES

### NT-001 — Double fallback plan_comptable
Les opérations hors vente utilisent le pattern suivant pour les comptes :
1. Trésoreries → `tresoreries` table (numero_compte)
2. Tiers (fournisseurs/clients/employés) → `tiers.compte_principal` ou `tiers.compte_responsabilite`
3. Comptes charges/produits/capital → `plan_comptable_entreprise` first, then fallback `plan_comptable_standard`

### NT-002 — Transactions multi-tables pour opérations comptables
Toute opération hors vente doit être atomique :
1. INSERT ecritures_comptables → récupère ecriture.id
2. INSERT lignes_ecriture (debit + credit) avec ecriture_id
3. INSERT operations_hors_av avec ecriture_id
4. (Si applicable) UPDATE creances/dettes, INSERT dettes (nouvelles)
Si une étape échoue, tout doit être rollbacké. Implémenter via fonction SQL ou via erreur catchée côté client (Supabase ne supporte pas les transactions client-side natives).

### NT-003 — Partie double stricte
Règle Guide §14 : ∑ Débits = ∑ Crédits — sinon BLOQUÉ.
Dans chaque dialog, calculer le total avant l'insert et afficher un message d'erreur si déséquilibré.
Le DB a `is_equilibree` (boolean) dans `ecritures_comptables` — peut être utilisé comme vérification post-insert.

### NT-004 — Couleurs statut créances/dettes
Tri créances/dettes : Par échéance croissante
- Rouge : échéance dépassée (< aujourd'hui)
- Orange : échéance dans moins de 7 jours
- Vert : normal

---
_Dernière mise à jour : 2026-05-04_
