# Rules — Supabase Base (Backend Database)

> Basé sur `guide/Guide_Document_SuccessFuel.md` + `guide/rules.md`
> Date de création : 2026-05-14
> Date de dernière mise à jour : 2026-05-14
> Ces règles s'appliquent en plus de celles de `CLAUDE.md`, `actions.md`, et `guide/demandes.md`

---

## PRINCIPES FONDAMENTAUX

### Source de vérité
- `guide/Guide_Document_SuccessFuel.md` reste la source de vérité absolue pour les règles métier
- `guide/rules.md` contient les règles techniques et l'architecture du projet
- `guide/rules_supabase_base.md` contient les règles spécifiques à la base de données Supabase
- `actions.md` contient l'historique des actions et corrections
- `guide/demandes.md` contient l'historique des demandes client

### Priorité des règles
En cas de conflit :
- **Guide_Document_SuccessFuel.md prévaut** pour les règles métier fondamentales
- **rules.md prévaut** pour les règles techniques (stack, architecture, tests)
- **rules_supabase_base.md prévaut** pour les règles spécifiques à la base de données

---

## RÈGLES DE SÉCURITÉ BASE DE DONNÉES

### Règle DB-01 : SECURITY DEFINER Interdit sur les Vues

**Règle** : Les vues NE DOIVENT PAS utiliser la propriété `SECURITY DEFINER`.

**Raison** : Les vues avec `SECURITY DEFINER` appliquent les permissions et les politiques RLS du créateur de la vue, plutôt que celles de l'utilisateur qui interroge. Cela contournent les politiques RLS et pose un risque de sécurité critique.

**Action corrective** :
1. Analyser chaque vue avec `SECURITY DEFINER`
2. Si la propriété n'est pas nécessaire : la supprimer ou passer à `SECURITY INVOKER`
3. Si la propriété est nécessaire (cas rare) : documenter pourquoi et s'assurer que RLS est correctement appliqué par d'autres moyens
4. Toujours tester la vue après modification

**Vues concernées** :
- `vue_dettes_en_cours`
- `vue_grand_livre`
- `vue_balance`
- `vue_creances_en_cours`
- `vue_mouvements_stock`
- `vue_capitaux_propres`

---

### Règle DB-02 : RLS Strict sur Toutes les Tables Sensibles

**Règle** : Row Level Security (RLS) doit être activé sur toutes les tables contenant des données sensibles.

**Tables sensibles** :
- Toutes les tables avec `entreprise_id`
- Toutes les tables avec `station_id`
- Tables comptables (`ecritures`, `comptes_comptables`)
- Tables tiers (`tiers`)
- Tables stocks (`stocks`, `mouvements_stock`)
- Tables trésorerie (`tresorerie`, `mouvements_tresorerie`)

**Politiques RLS** :
- Chaque gérant ne voit que les données de ses entreprises/stations
- Le partenaire voit uniquement les données opérationnelles de son réseau (jamais financières)
- Les sessions employés héritent des droits du compte parent + restrictions supplémentaires
- Les erreurs RLS doivent être anticipées et corrigées avant déploiement

---

### Règle DB-03 : Pas de Queries Directes à auth.users Côté Client

**Règle** : NE JAMAIS faire de query directe à `auth.users` côté client.

**Alternative** : Toujours passer par la table `comptes` qui fait le pont entre `auth.users` et les données métier.

---

## RÈGLES DE PERFORMANCE

### Règle DB-04 : Index sur Toutes les Foreign Keys

**Règle** : Toutes les foreign keys DOIVENT avoir un index.

**Raison** : Les jointures sans index causent des sequential scans lents.

**Action** :
1. Identifier toutes les FK sans index
2. Créer des index sur ces colonnes
3. Nommer les index de manière descriptive (ex: `idx_table_fk_column`)

**Exemple** :
```sql
CREATE INDEX idx_ecritures_compte_id ON ecritures(compte_id);
CREATE INDEX idx_ecritures_station_id ON ecritures(station_id);
CREATE INDEX idx_ecritures_entreprise_id ON ecritures(entreprise_id);
```

---

### Règle DB-05 : Index sur Colonnes Fréquemment Filtrées

**Règle** : Les colonnes fréquemment utilisées dans WHERE, ORDER BY, et JOIN DOIVENT avoir des index.

**Colonnes prioritaires** :
- `date_ecriture` (table `ecritures`)
- `created_at` (toutes les tables avec timestamps)
- `statut` (tables avec workflow)
- `type` (tables avec catégories)

**Index composites** :
Pour les requêtes multi-colonnes fréquentes, utiliser des index composites :
```sql
CREATE INDEX idx_ecritures_date_station ON ecritures(date_ecriture, station_id);
```

---

### Règle DB-06 : Éviter SELECT *

**Règle** : TOUJOURS sélectionner uniquement les colonnes nécessaires.

**Raison** : `SELECT *` transfère des données inutiles, augmente l'utilisation réseau, et empêche l'utilisation d'index covering.

**Mauvais** :
```sql
SELECT * FROM ecritures WHERE station_id = 'xxx';
```

**Bon** :
```sql
SELECT id, date_ecriture, compte_id, debit, credit 
FROM ecritures 
WHERE station_id = 'xxx';
```

---

### Règle DB-07 : Utiliser des Transactions pour Opérations Multi-Tables

**Règle** : Toute opération modifiant plusieurs tables DOIT être dans une transaction.

**Raison** : Garantir l'atomicité (ACID) - soit tout réussit, soit tout échoue.

**Exemple** :
```sql
BEGIN;
-- Insert écriture comptable
INSERT INTO ecritures (...) VALUES (...);
-- Mouvement stock
INSERT INTO mouvements_stock (...) VALUES (...);
-- Update stock
UPDATE stocks SET quantite = quantite - ... WHERE id = ...;
COMMIT;
```

---

### Règle DB-08 : Batching des Écritures Multiples

**Règle** : Pour les insertions multiples, utiliser le batching plutôt que des insertions individuelles.

**Mauvais** :
```javascript
for (const item of items) {
  await supabase.from('ecritures').insert(item);
}
```

**Bon** :
```javascript
await supabase.from('ecritures').insert(items);
```

---

### Règle DB-09 : Configuration du Cache (TanStack Query)

**Règle** : Configurer `staleTime` approprié pour chaque type de donnée.

**Recommandations** :
- Données statiques (plan comptable) : `staleTime: Infinity`
- Données peu fréquentes (prix carburant) : `staleTime: 5 * 60 * 1000` (5 min)
- Données fréquentes (stocks) : `staleTime: 30 * 1000` (30 sec)
- Données très fréquentes (KPIs dashboard) : `staleTime: 60 * 1000` (1 min)
- Données temps réel (ventes live) : `staleTime: 0` + Realtime subscription

---

## RÈGLES DE MAINTENANCE

### Règle DB-10 : AUTOVACUUM Configuré

**Règle** : AUTOVACUUM doit être configuré pour les tables à forte activité.

**Configuration recommandée** :
```sql
ALTER TABLE ecritures SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

---

### Règle DB-11 : VACUUM ANALYZE Régulier

**Règle** : Exécuter régulièrement `VACUUM ANALYZE` sur les tables volumineuses.

**Fréquence** : Hebdomadaire pour les tables à forte activité, mensuel pour les autres.

---

### Règle DB-12 : Archivage des Données Historiques

**Règle** : Archiver les données historiques (ex: > 1 an) pour réduire la taille des tables actives.

**Processus** :
1. Identifier les tables avec beaucoup de données historiques
2. Créer des tables d'archivage
3. Implémenter un processus d'archivage automatique (trigger ou fonction)
4. Documenter le processus de restauration

---

## RÈGLES DE CONCEPTION SCHÉMA

### Règle DB-13 : Types de Données Optimaux

**Règle** : Utiliser les types de données les plus petits possibles.

**Recommandations** :
- Utiliser `SMALLINT` au lieu de `INTEGER` quand possible
- Utiliser `VARCHAR(n)` avec une limite appropriée
- Utiliser `TEXT` seulement pour les données de longueur variable
- Utiliser `DECIMAL(p, s)` pour les montants monétaires (pas FLOAT)

---

### Règle DB-14 : Contraintes CHECK pour Validation

**Règle** : Ajouter des contraintes CHECK pour la validation des données.

**Exemples** :
```sql
ALTER TABLE ecritures 
ADD CONSTRAINT check_partie_double 
CHECK (debit > 0 OR credit > 0);

ALTER TABLE cuves 
ADD CONSTRAINT check_capacite_positive 
CHECK (capacite_max > 0);
```

---

### Règle DB-15 : ON DELETE CASCADE Approprié

**Règle** : Utiliser `ON DELETE CASCADE` uniquement quand cela a du sens métier.

**Exemples appropriés** :
- Supprimer une entreprise → supprimer toutes ses stations
- Supprimer une station → supprimer tous ses shifts

**Exemples INAPPROPRIÉS** :
- Supprimer un compte comptable utilisé → devrait bloquer (RESTRICT)

---

## RÈGLES DE LOGIQUE MÉTIER

### Règle DB-16 : Logique Critique en SQL

**Règle** : Toute logique métier critique DOIT être en SQL (fonctions, triggers), pas en JavaScript.

**Fonctions SQL clés** :
- `get_volume_from_jauge(cuve_id, hauteur_cm)` : interpolation linéaire calibrages
- `calculer_cmup(article_id, station_id)` : CMUP courant
- `verifier_partie_double(ecriture_id)` : ∑D = ∑C (bloquant)
- `generer_numero_tiers(type, entreprise_id)` : 401-001, 411-001, etc.
- `generer_numero_tresorerie(type, entreprise_id)` : 512-001, 530-001, etc.

---

### Règle DB-17 : CMUP Seule Méthode de Valorisation

**Règle** : CMUP (Coût Moyen Unitaire Pondéré) est la SEULE méthode de valorisation des stocks.

**Calcul** : `(Stock × CMUP_ancien + Volume × PA) ÷ (Stock + Volume)`

**Implémentation** : Trigger SQL `calculer_cmup()` automatique à chaque mouvement.

---

### Règle DB-18 : Partie Double Bloquante

**Règle** : Partie double obligatoire et BLOQUANTE : ∑ Débits = ∑ Crédits.

**Implémentation** : Fonction SQL `verifier_partie_double()` appelée avant validation.

---

## RÈGLES DE MONITORING

### Règle DB-19 : Surveiller les Performances

**Règle** : Surveiller régulièrement les performances de la base de données.

**Métriques à surveiller** :
- CPU usage
- IOPS (read/write)
- Latence des requêtes
- Taille des tables
- Taux de cache hits

**Outils** : Supabase Dashboard, pg_stat_statements

---

### Règle DB-20 : Surveiller les Erreurs RLS

**Règle** : Surveiller les erreurs RLS et les corriger avant déploiement.

**Erreurs types** :
- `new row violates row-level security policy`
- `select permission denied`

**Action** : Corriger les politiques RLS avant de déployer.

---

## RÈGLES DE TESTS

### Règle DB-21 : Tests pour Modifications SQL

**Règle** : Toute modification SQL DOIT avoir des tests associés.

**Types de tests** :
- Tests unitaires pour les fonctions SQL
- Tests E2E pour les parcours utilisateurs
- Tests de performance pour les requêtes optimisées

---

### Règle DB-22 : Mock de Base de Données pour Tests

**Règle** : Utiliser une base de données mockée pour tous les tests.

**Raison** : Ne jamais toucher la base de données de production avec les tests.

---

## CONCLUSION

Ces règles complètent celles du Guide_Document_SuccessFuel.md, rules.md, actions.md et guide/demandes.md. Elles s'appliquent spécifiquement à la base de données Supabase et aux opérations backend.

Toute nouvelle demande ou modification de la base de données devra respecter ces règles.

La date de création de ce fichier est le 2026-05-14.
