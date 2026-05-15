---
description: APEX 2026-05-15-01 — Agréger tiers/trésoreries/articles dans la page Plan Comptable (Guide §8.1 lignes 328-333)
argument-hint: <aucun — lancer directement>
priority: 🔴 CRITIQUE
---

<objective>
Le Guide §8.1 (lignes 328-333) impose :
> "Classes 3, 4, 5 : auto-générés à la création des tiers/articles/trésoreries"

`StructureComptesPage.tsx` (498L) ne lit aujourd'hui que `plan_comptable_standard` + `plan_comptable_entreprise`.
→ Les fournisseurs (401-xxx), clients (411-xxx), employés (421-xxx + 460-xxx), articles stock (3xx) et trésoreries (512/513/514/530-xxx) créés ailleurs **n'apparaissent jamais** dans le Plan Comptable.

Bug observé : "j'ai créé des fournisseurs et clients qui ne sont pas affichés".

Objectif : la page Plan Comptable affiche un arbre **complet** de tous les comptes utilisés par l'entreprise, sans rien créer de redondant en DB.
</objective>

<context>
Fichiers à analyser :
- guide/Guide_Document_SuccessFuel.md §8.1, §8.2, §8.4 (auto-numérotation 401-xxx, 411-xxx, 512-xxx...)
- src/components/manager/parametres/StructureComptesPage.tsx (lecture actuelle limitée)
- src/services/comptesService.ts
- src/services/tiersService.ts (createTiers utilise rpc generer_numero_tiers)
- src/services/tresorerieService.ts
- src/services/articleService.ts (rattachement aux comptes 310/320/330/340/350/360/370)
- src/types/supabase.ts (tables : tiers, tresoreries, articles, plan_comptable_standard, plan_comptable_entreprise)
- scripts/reborn.sql (fonctions generer_numero_tiers, generer_numero_tresorerie)

Tables sources de comptes auto-générés :
- `tiers` (compte_principal, compte_responsabilite) → classe 4
- `tresoreries` (numero_compte) → classe 5
- `articles` (numero_compte_stock) ou via famille → classe 3

Règles métier :
- Numéros de comptes JAMAIS affichés en frontend (sauf Grand Livre/Balance) — afficher libellés
- Compte centralisateur (401, 411, 421, 460, 310, 320...) : si sous-comptes existent, le parent ne reçoit plus d'écritures directes
- Classes 6 & 7 figées (préchargées dans `plan_comptable_standard`)
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire StructureComptesPage.tsx en entier
2. Identifier les RPC SQL existantes (`generer_numero_tiers`, `generer_numero_tresorerie`, `generer_numero_sous_compte`)
3. Vérifier dans Supabase si une vue `vue_plan_comptable_complet` existe (sinon la créer)
4. Lister les colonnes de `tiers`, `tresoreries`, `articles` qui contiennent les numéros et libellés

## ÉTAPE 2 — PLAN
Option A (préférée — moins invasive) : créer une **vue SQL** `vue_plan_comptable_complet` qui UNION ALL :
- plan_comptable_standard (filtre classes 1,2,6,7 figées)
- plan_comptable_entreprise (sous-comptes manuels classes 1,2)
- tiers (classe 4 — fournisseurs/clients/employés)
- tresoreries (classe 5)
- articles (classe 3) ou comptes générés par famille article

Option B (alternative) : modifier le frontend pour faire 4 queries en parallèle et fusionner côté client.

Recommandation : **Option A** (performance + cohérence RLS).

## ÉTAPE 3 — EXECUTE
1. Créer la migration `add_vue_plan_comptable_complet` :
   ```sql
   CREATE OR REPLACE VIEW public.vue_plan_comptable_complet AS
   SELECT
     pcs.id::text AS id,
     pcs.numero,
     pcs.libelle,
     pcs.classe,
     pcs.is_centralisateur,
     pcs.numero_parent,
     'standard' AS source,
     NULL::uuid AS entreprise_id
   FROM plan_comptable_standard pcs
   UNION ALL
   SELECT
     pce.id::text, pce.numero, pce.libelle, pce.classe,
     pce.is_centralisateur, pce.numero_parent,
     'entreprise', pce.entreprise_id
   FROM plan_comptable_entreprise pce
   WHERE pce.is_active = true
   UNION ALL
   SELECT
     t.id::text, t.compte_principal, t.nom, 4,
     false, LEFT(t.compte_principal, 3),
     'tiers', t.entreprise_id
   FROM tiers t
   WHERE t.is_active = true
   UNION ALL
   -- + 460-xxx pour employés
   SELECT t.id::text || '-460', t.compte_responsabilite, t.nom || ' (Resp. opér.)', 4,
          false, '460', 'tiers_460', t.entreprise_id
   FROM tiers t
   WHERE t.type = 'employe' AND t.compte_responsabilite IS NOT NULL AND t.is_active = true
   UNION ALL
   SELECT
     tr.id::text, tr.numero_compte, tr.libelle, 5,
     false, LEFT(tr.numero_compte, 3),
     'tresorerie', tr.entreprise_id
   FROM tresoreries tr
   WHERE tr.is_active = true;
   ```
   (avec SECURITY INVOKER + RLS héritée des tables sources)

2. Modifier `StructureComptesPage.tsx` pour lire la vue au lieu des 2 tables séparées :
   ```typescript
   const { data } = await supabase
     .from("vue_plan_comptable_complet")
     .select("*")
     .or(`entreprise_id.eq.${entreprise.id},entreprise_id.is.null`)
     .order("numero");
   ```

3. Adapter `buildTree()` et `CompteRow` pour gérer les 5 sources (`source` discriminator).

4. Bouton "Sous-compte" : autoriser uniquement si `source IN ('standard','entreprise')` ET `classe IN (1,2)`.

5. Bouton "Supprimer" : autoriser uniquement si `source = 'entreprise'` ET pas de mouvements.

6. Badge source : "Standard" / "Personnalisé" / "Tiers" / "Trésorerie" / "Article".

## ÉTAPE 4 — VALIDATE
- [ ] Créer un fournisseur via /manager/parametres/tiers → apparaît immédiatement dans l'arbre Classe 4 sous "401 Fournisseurs"
- [ ] Créer un client → 411-xxx visible
- [ ] Créer un employé → 421-xxx + 460-xxx visibles
- [ ] Créer une trésorerie type "banque" → 512-xxx visible Classe 5
- [ ] Plan comptable affiche TOUS les comptes utilisés
- [ ] Numéros invisibles partout (afficher libellés uniquement)
- [ ] Test unitaire : vue retourne fournisseurs/clients/trésoreries
- [ ] Test E2E : créer fournisseur → vérifier apparition dans Plan Comptable
</process>

<rules>
- Vue SECURITY INVOKER (jamais SECURITY DEFINER) — Guide rules_supabase_base.md
- Les numéros de compte restent INVISIBLES (libellé uniquement)
- Pas de duplication DB : la vue ne crée rien, elle agrège
- RLS : la vue hérite des RLS des tables sources
- Performance ≤ 1s (ajouter index sur tiers.entreprise_id, tresoreries.entreprise_id si absent)
</rules>
