# APEX PLAN — Optimisation Base de Données Supabase

> **Date de création** : 2026-05-14
> **Date de dernière mise à jour** : 2026-05-14
> **Objectif** : Optimiser les requêtes CPU-intensives, corriger les problèmes de sécurité (SECURITY DEFINER), et améliorer les performances globales de la base de données
> **Priorité** : CRITIQUE

---

## CONTEXTE

### Problèmes identifiés

**Problèmes de performance :**
- Requêtes CPU-intensives causant une haute utilisation CPU
- IOPS de lecture élevés nécessitant une meilleure indexation
- Écritures disque intensives excessives
- Besoin d'optimisation du cache et du batching
- Besoin d'archivage des données historiques

**Problèmes de sécurité :**
- 6 vues définies avec la propriété SECURITY DEFINER (risque RLS contourné) :
  - `public.vue_dettes_en_cours`
  - `public.vue_grand_livre`
  - `public.vue_balance`
  - `public.vue_creances_en_cours`
  - `public.vue_mouvements_stock`
  - `public.vue_capitaux_propres`

---

## PLAN D'EXÉCUTION

### ÉTAPE 1 — Analyse de la base de données existante

**Objectif** : Comprendre la structure actuelle, identifier les tables volumineuses, les index manquants, et les requêtes lentes.

**Actions** :
1. Lister toutes les tables avec leurs tailles
2. Identifier les tables sans index sur les FK
3. Analyser les vues avec SECURITY DEFINER
4. Vérifier les triggers et fonctions SQL coûteuses
5. Identifier les tables candidates à l'archivage

**Outils** :
- Supabase MCP Server
- Commandes SQL : `table-sizes`, `pg_stat_user_tables`, `pg_stat_user_indexes`

---

### ÉTAPE 2 — Correction des problèmes de sécurité (SECURITY DEFINER)

**Objectif** : Corriger les 6 vues avec SECURITY DEFINER pour utiliser SECURITY INVOKER ou supprimer la propriété si non nécessaire.

**Vues à corriger** :
1. `vue_dettes_en_cours`
2. `vue_grand_livre`
3. `vue_balance`
4. `vue_creances_en_cours`
5. `vue_mouvements_stock`
6. `vue_capitaux_propres`

**Actions** :
1. Analyser chaque vue pour comprendre son utilité
2. Vérifier si SECURITY DEFINER est nécessaire
3. Si non nécessaire : supprimer la propriété ou passer à SECURITY INVOKER
4. Si nécessaire : documenter pourquoi et s'assurer que RLS est correctement appliqué
5. Tester chaque vue après modification

**Règle** : Ne jamais drop les tables ou données sans vérification préalable.

---

### ÉTAPE 3 — Optimisation des index

**Objectif** : Ajouter des index stratégiques pour réduire les sequential scans et améliorer les performances.

**Actions** :
1. Identifier les colonnes fréquemment utilisées dans WHERE, JOIN, ORDER BY
2. Ajouter des index sur les FK sans index
3. Ajouter des index composites pour les requêtes multi-colonnes
4. Créer des index partiels pour les filtres fréquents
5. Ajouter des index GIN/GiST si nécessaire (pour JSONB, full-text search)

**Tables prioritaires** :
- `ecritures` (comptabilité)
- `mouvements_stock` (stocks)
- `shifts_carburant` (ventes carburant)
- `achats_carburant` (achats)
- `inventaires_carburant` (inventaires)

---

### ÉTAPE 4 — Optimisation des requêtes

**Objectif** : Optimiser les requêtes CPU-intensives identifiées.

**Actions** :
1. Analyser les requêtes lentes avec `EXPLAIN ANALYZE`
2. Réécrire les requêtes pour éviter les N+1 queries
3. Utiliser des CTE (Common Table Expressions) pour la lisibilité
4. Optimiser les jointures (utiliser les index)
5. Réduire les SELECT * en sélectionnant uniquement les colonnes nécessaires
6. Implémenter le batching pour les écritures multiples

---

### ÉTAPE 5 — Implémentation du cache et batching

**Objectif** : Minimiser les accès disque répétitifs et améliorer le throughput.

**Actions** :
1. Configurer le cache Supabase (Edge Functions caching)
2. Implémenter le batching côté client (TanStack Query)
3. Utiliser React Query pour le cache des données fréquemment accédées
4. Configurer `staleTime` approprié pour chaque type de donnée
5. Implémenter le debouncing pour les recherches

---

### ÉTAPE 6 — Archivage des données historiques

**Objectif** : Réduire la taille des tables actives en archivant les données historiques.

**Actions** :
1. Identifier les tables avec beaucoup de données historiques
2. Définir une politique d'archivage (ex: données > 1 an)
3. Créer des tables d'archivage
4. Implémenter un processus d'archivage automatique (trigger ou fonction)
5. Documenter le processus de restauration si nécessaire

---

### ÉTAPE 7 — Optimisation du schéma

**Objectif** : Optimiser le schéma de base de données pour l'efficacité.

**Actions** :
1. Vérifier les types de données (utiliser les plus petits possibles)
2. Normaliser si nécessaire (éviter la redondance)
3. Ajouter des contraintes CHECK pour la validation
4. Optimiser les colonnes JSONB (indexation si nécessaire)
5. Vérifier les foreign keys avec ON DELETE CASCADE

---

### ÉTAPE 8 — VACUUM et maintenance

**Objectif** : Réclamer l'espace des tuples morts et optimiser le stockage.

**Actions** :
1. Configurer AUTOVACUUM avec des paramètres optimisés
2. Exécuter VACUUM ANALYZE sur les tables volumineuses
3. Configurer le VACUUM automatique pour les tables à forte activité
4. Surveiller l'espace disque et les bloat

---

### ÉTAPE 9 — Connection pooling

**Objectif** : Optimiser la gestion des connexions pour une haute utilisation.

**Actions** :
1. Vérifier l'utilisation actuelle des connexions
2. Configurer PgBouncer si nécessaire
3. Optimiser le timeout des connexions
4. Vérifier le code d'application pour les fuites de connexions

---

### ÉTAPE 10 — Tests

**Objectif** : S'assurer que toutes les optimisations ne cassent pas la fonctionnalité existante.

**Actions** :
1. Tests unitaires pour les fonctions SQL modifiées
2. Tests E2E pour les parcours utilisateurs critiques
3. Tests de performance pour les requêtes optimisées
4. Tests de sécurité pour les vues modifiées

---

### ÉTAPE 11 — Documentation

**Objectif** : Documenter toutes les modifications et les raisons.

**Actions** :
1. Mettre à jour `guide/rules_supabase_base.md` avec les nouvelles règles
2. Documenter toutes les actions dans `guide/actions.md`
3. Documenter le prompt et les résultats dans `guide/demandes.md`
4. Mettre à jour `CLAUDE.md` et `AGENTS.md` avec les règles de processus

---

### ÉTAPE 12 — Validation finale

**Objectif** : Valider que tout fonctionne correctement avant le déploiement.

**Actions** :
1. Exécuter tous les tests (unitaires + E2E)
2. Lancer le linting ESLint (0 erreur)
3. Vérifier TypeScript (tsc --noEmit, 0 erreur)
4. Builder le projet (npm run build)
5. Git add, commit, push

---

## RÈGLES À SUIVRE

1. **NE JAMAIS drop de tables ou de données sans vérification préalable**
2. **Toujours tester les modifications SQL sur un environnement de développement**
3. **Documenter chaque modification avec la raison**
4. **Utiliser des transactions pour les modifications multi-tables**
5. **Vérifier les RLS après chaque modification de vue**
6. **Surveiller les performances après chaque optimisation**

---

## CRITÈRES DE SUCCÈS

- [ ] Les 6 vues n'ont plus SECURITY DEFINER (ou sont documentées si nécessaire)
- [ ] Les requêtes CPU-intensives sont optimisées
- [ ] Les index stratégiques sont en place
- [ ] Le cache et le batching sont implémentés
- [ ] Les tests passent (unitaires + E2E)
- [ ] ESLint : 0 erreur
- [ ] TypeScript : 0 erreur
- [ ] Build : succès
- [ ] Git commit et push effectué

---

## NOTES

- Ce plan sera exécuté strictement dans l'ordre
- Chaque étape sera documentée dans `guide/actions.md`
- En cas de problème, la procédure sera ajustée et documentée
