---
description: APEX 2026-05-15-08 — Vérifier conformité DB du plan comptable standard avec Guide §8.1 (70 comptes ventilés)
argument-hint: <aucun — lancer directement>
priority: 🔴 CRITIQUE
---

<objective>
Guide §8.1 spécifie un plan comptable précis avec ventilations critiques :
- **Classe 1** : 101, 120, 161, 455, 457
- **Classe 2** : 211, 215, 218, 220, 228, 240
- **Classe 3** : 310 (Essence SP95/SP91), 320 (Gasoil), 330 (Pétrole), 340 (Lubrifiants), 350 (GPL), 360 (Marchandises), 370 (Pièces)
- **Classe 4** : 401, 411, 421, 431, 432, 444, 447, 4454, 460
- **Classe 5** : 512, 513, 514, 530
- **Classe 6** : 601, 602, **603 centralisateur**, **6031–6037 sous-comptes CAMV**, 605–620, 630, 640, 651, 652, 653, 654, 661, 690
- **Classe 7** : **706 centralisateur**, **7061–7069 services**, **707 centralisateur**, **7071–7077 ventes**, 751, 752, 753, 761

Référence : `scripts/SUCCESSFUEL_PLAN_COMPTABLE_UPDATE.sql` (action #007 du 2026-05-03).

Objectif : vérifier qu'en DB la table `plan_comptable_standard` contient EXACTEMENT ces comptes, avec les bons `is_centralisateur` et `numero_parent`. Vérifier que les flux comptables (achat carburant, vente carburant, etc.) référencent les bons numéros.
</objective>

<context>
Fichiers à analyser :
- guide/Guide_Document_SuccessFuel.md §8.1 (lignes 220-300 environ)
- scripts/SUCCESSFUEL_PLAN_COMPTABLE_UPDATE.sql
- scripts/reborn.sql (référence DB)
- src/services/* (rechercher numéros de compte hardcodés)
- supabase migrations history

Règles Guide :
- 6031–6037 = sous-comptes CAMV (Coût Achat Marchandises Vendues) par famille
- 7061–7069 = services (lavage, vulcanisation, parking, autres)
- 7071–7077 = ventes par famille produit
- Centralisateur : si sous-comptes existent → parent ne reçoit plus d'écritures
- 460 = compte de Responsabilité Opérationnelle (manquants shifts)
- 120 = Résultat net (utilisé dashboard pour capitaux propres nets)
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Connecter Supabase MCP : `mcp7_list_tables` puis `mcp7_execute_sql` pour lister tous les comptes :
   ```sql
   SELECT classe, numero, libelle, is_centralisateur, numero_parent
   FROM plan_comptable_standard
   ORDER BY numero;
   ```
2. Comparer ligne à ligne avec Guide §8.1
3. Lister les écarts (manquants, en trop, libellés erronés)

## ÉTAPE 2 — PLAN
1. Migration corrective si écarts (UPSERT) :
   ```sql
   INSERT INTO plan_comptable_standard (numero, libelle, classe, is_centralisateur, numero_parent)
   VALUES (...)
   ON CONFLICT (numero) DO UPDATE SET libelle = EXCLUDED.libelle, ...;
   ```
2. Recherche dans le code de tous les hardcodes `'401'`, `'411'`, `'7071'`, `'603'`, `'6031'`, etc.
3. Vérifier dans `achatCarburantService` / `venteCarburantService` que les écritures pointent sur :
   - Vente Essence → 7071
   - CAMV Essence → 6031
   - Stock Essence → 310
   - etc.

## ÉTAPE 3 — EXECUTE
1. Audit DB via MCP
2. Migration corrective
3. Audit code (grep numéros)
4. Tests : créer une vente carburant Essence → vérifier les écritures sur 7071/6031/310
5. Tests partie double sur chaque flux

## ÉTAPE 4 — VALIDATE
- [ ] `plan_comptable_standard` contient ≥ 70 comptes conformes au Guide
- [ ] Comptes centralisateurs flagués correctement (603, 706, 707)
- [ ] Aucun hardcode incohérent dans les services
- [ ] Vente Essence génère écriture 7071 (pas 707 directement)
- [ ] CAMV Essence génère 6031 (pas 603)
- [ ] Inventaire : écart sur 651/751 (carburants), 652/752 (boutique)
- [ ] Test SQL : SELECT count(*) FROM plan_comptable_standard WHERE numero IN ('6031','6032','...') = 7
</process>

<rules>
- NE JAMAIS DROP la table — UPSERT uniquement
- Migrations Supabase via mcp7_apply_migration
- Vérifier d'abord, modifier ensuite
- Les flux comptables (services) doivent pointer sur les sous-comptes (6031, pas 603)
- Centralisateur : pas d'écriture directe quand sous-comptes existent
</rules>
