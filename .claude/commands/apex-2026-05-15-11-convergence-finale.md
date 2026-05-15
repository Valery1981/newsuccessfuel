---
description: APEX 2026-05-15-11 — Boucle de convergence finale : audit exhaustif src/ ↔ Guide_Document_SuccessFuel.md, correction et re-itération jusqu'à alignement total
argument-hint: <aucun — exécuter en tout dernier, après APEX 01→10>
priority: 🔴 CRITIQUE (clôture du cycle)
---

<objective>
Après l'exécution des APEX 01→10, lancer une **passe d'audit exhaustive** de l'intégralité de `src/` contre `guide/Guide_Document_SuccessFuel.md` (les 18 sections + 20 règles métier).

Règle : si écart détecté → l'analyser, l'implémenter/corriger, **relancer la boucle**.
Si aucun écart → STOP.

Cette commande est récursive : elle se relance elle-même tant que le diff n'est pas vide.
</objective>

<context>
Documents de référence (par ordre de priorité) :
1. `guide/Guide_Document_SuccessFuel.md` — source de vérité absolue (§1-§18, 20 règles §14)
2. `guide/DIFF.md` — modifications client postérieures (à intégrer comme partie de la spec)
3. `guide/rules.md` — transcription des règles
4. `guide/rules_supabase_base.md` — règles DB (DB-01 à DB-22)
5. `CLAUDE.md` — résumé opérationnel
6. `scripts/reborn.sql` — référence DB

Périmètre d'audit `src/` :
- `src/app/(auth|onboarding|manager|partner|admin)/**`
- `src/components/**`
- `src/services/**`
- `src/hooks/**`
- `src/stores/**`
- `src/lib/**`
- `src/types/supabase.ts`
- `e2e/**` et tests Vitest

Domaines à parcourir explicitement :
- §1 Présentation générale (philosophie : compta automatique, numéros invisibles)
- §2 Types de comptes & sessions (4 rôles + droits granulaires)
- §3 Stack technique (vérifier conformité Next.js 16, TypeScript strict, etc.)
- §4 Architecture projet (route groups, services, hooks)
- §5 Design system (palette dark + responsive + skeletons + Sonner)
- §6 Auth & redirections (RLS strict, redirection par type)
- §7 Onboarding gérant (6 étapes + calibrage 3 règles + import multi-format)
- §8 Page Structure (8.1 Plan comptable, 8.2 Tiers, 8.3 Articles, 8.4 Trésorerie, 8.5 Prix carburant, 8.6 Objectifs, 8.7 Seuils alerte, 8.8 Camions)
- §9 Page Initialisation (7 onglets + Valider irréversible + capital net)
- §10 Page Traitement (10.1 Achat carb 4 onglets, 10.2 Vente carb shifts, 10.3 Achat boutique 3 modes, 10.4 POS, 10.5 Transfert, 10.6 Inventaire carb, 10.7 Inventaire boutique, 10.8 Opérations hors A&V)
- §11 Dashboard gérant (KPIs + graphiques recharts + alertes)
- §12 Interface partenaire (dashboard, stations, doléances, rapports, sessions TM)
- §13 Rapports (financiers, commerciaux, stocks)
- §14 20 règles métier critiques
- §15 Base de données (RPC, RLS, transactions)
- §16 Tests obligatoires
- §17 Fichiers de suivi
- §18 Notes (perf ≤1s, realtime doléances uniquement)
</context>

<process>
## ÉTAPE 1 — INVENTAIRE Guide
Construire un check-list exhaustif (~200 items) à partir des 18 sections du Guide.
Format ligne :
```
[§X.Y] <règle ou fonctionnalité> | Source : <fichier ligne>
```

Sauvegarder dans `guide/apex/CONVERGENCE_CHECKLIST_2026-05-15.md`.

## ÉTAPE 2 — SCAN src/
Pour chaque item :
1. `grep_search` ou `code_search` ciblé sur le mot-clé
2. Lire le fichier candidat
3. Statut : ✅ conforme / ⚠️ partiel / ❌ absent / 🔍 à vérifier manuellement

Items à vérifier en priorité (heuristiques d'écarts probables) :
- Numéros de compte invisibles partout sauf Grand Livre/Balance (§14 #1)
- Partie double bloquante sur TOUTES les écritures (§14 #2)
- CMUP via `calculer_cmup()` (§14 #3)
- `get_volume_from_jauge()` / `interpolateVolume()` partout (§14 #4)
- Shift carburant : pas d'ouverture manuelle (§14 #5, #6, #7)
- POS boutique : même session (§14 #8)
- Stock boutique temps réel (§14 #9)
- Comptabilisation boutique groupée à la clôture (§14 #10)
- Prix carburant historisé (§14 #11)
- Mouvementer avant Comptabiliser (§14 #12)
- Valider Initialisation irréversible (§14 #13)
- Facture boutique non-partenaire soldée à 0 (§14 #14)
- 460 = écart non justifié (§14 #15)
- Partenaire : zéro financier (§14 #16)
- Calibrage 3 règles (§14 #17, #18)
- POS : seuls éléments cochés visibles (§14 #19)
- Sessions droits granulaires page Users obligatoire (§14 #20)
- Realtime doléances uniquement (§18)
- Performance ≤ 1s (§18)
- DIFF.md intégré

## ÉTAPE 3 — RAPPORT D'ÉCARTS
Produire `guide/apex/CONVERGENCE_REPORT_2026-05-15_iterN.md` listant :
- Écarts trouvés (avec citation `@<file>:<lines>`)
- Sévérité (🔴 critique / 🟠 haute / 🟡 moyenne / ℹ️ note)
- Action recommandée (correctif minimal)
- APEX existant qui couvre cet écart (s'il y en a un)

## ÉTAPE 4 — DÉCISION
- Si rapport vide → ✅ STOP. Marquer la convergence atteinte dans `guide/actions.md` (ACTION FINALE) + commit doc.
- Si écarts critiques/hauts → créer un nouveau APEX `apex-2026-05-15-12-iterN-...md` ou modifier un APEX existant, l'exécuter (suivre le processus CLAUDE.md tests/lint/tsc/build/commit/push), puis **relancer cette commande** depuis ÉTAPE 1.
- Si seulement écarts moyens/notes → décision utilisateur (ouvert/fermé selon impact).

## ÉTAPE 5 — JOURNAL
À chaque itération :
- Ajouter une entrée dans `guide/actions.md` : "ACTION #X — Convergence itération N"
- Indiquer N écarts trouvés, M corrigés, L reportés
- Indiquer le hash du commit final
- Mettre à jour `todo.md`

## CRITÈRE D'ARRÊT (STOP CONDITION)
Tous les items du checklist sont en statut ✅ conforme ou ℹ️ note explicitement validée par l'utilisateur.

## SÉCURITÉ ANTI-BOUCLE INFINIE
- Maximum 5 itérations par session
- Si après 5 itérations le rapport n'est toujours pas vide → ESCALATE à l'utilisateur avec liste des écarts résiduels
</process>

<rules>
- Ne JAMAIS modifier `guide/Guide_Document_SuccessFuel.md` pendant la convergence (c'est la spec — on s'y aligne)
- Si un écart révèle une ambiguïté du Guide → poser la question à l'utilisateur, ne pas inventer
- Toute correction = mini-APEX + tests + commit séparé (atomicité)
- Respecter strictement CLAUDE.md (tests, lint, tsc, build avant push)
- Ne pas créer de nouveaux fichiers de suivi si déjà existants — append plutôt
- Privilégier les corrections minimales (moins de risque de régression)
</rules>

<exit_artifacts>
- `guide/apex/CONVERGENCE_CHECKLIST_2026-05-15.md` (réutilisé entre itérations)
- `guide/apex/CONVERGENCE_REPORT_2026-05-15_iter1.md`, `_iter2.md`, … (un par itération)
- `guide/actions.md` : entrées ACTION par itération
- Commits Git atomiques par mini-correctif
- Tag final `convergence-2026-05-15-ok` quand STOP atteint
</exit_artifacts>
