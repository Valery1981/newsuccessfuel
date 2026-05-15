---
description: APEX 2026-05-15-00 — Master plan d'intégration des 10 APEX du 15/05/2026 (alignement strict src/ ↔ Guide_Document_SuccessFuel.md)
argument-hint: <ordre d'exécution>
---

# Master Plan — Intégration des APEX 2026-05-15

## Contexte

Audit comparatif `@/src` ↔ `@/guide/Guide_Document_SuccessFuel.md` réalisé le 2026-05-15.
3 problèmes explicitement remontés par l'utilisateur :

- Plan Comptable n'affiche pas les tiers/trésoreries auto-générés (Guide §8.1 lignes 328-333)
- Initialisation : layout single column au lieu de 2 colonnes (gauche=synthèse, droite=tabs)
- Onglet Cuves Initialisation : Volume saisi manuellement au lieu d'être calculé via calibrages (Guide §10.2 ligne 418)

→ 10 APEX créés pour aligner strictement l'application sur le Guide.

## Liste des APEX (priorité décroissante)

| #   | Fichier                                              | Priorité    | Effort | Dépendances        |
| --- | ---------------------------------------------------- | ----------- | ------ | ------------------ |
| 01  | apex-2026-05-15-01-plan-comptable-aggrege            | 🔴 CRITIQUE | M      | DB migration (vue) |
| 02  | apex-2026-05-15-02-initialisation-layout-volume-auto | 🔴 CRITIQUE | M      | aucune             |
| 03  | apex-2026-05-15-03-calibrage-3-regles-strictes       | 🟠 HAUTE    | S      | aucune             |
| 04  | apex-2026-05-15-04-noperations-architecture          | 🟠 HAUTE    | L      | aucune             |
| 05  | apex-2026-05-15-05-realtime-doleances-uniquement     | 🟡 MOYENNE  | S      | aucune             |
| 06  | apex-2026-05-15-06-partner-dashboard-diff            | 🟠 HAUTE    | L      | DIFF.md            |
| 07  | apex-2026-05-15-07-permissions-boutons-sensibles     | 🟠 HAUTE    | M      | aucune             |
| 08  | apex-2026-05-15-08-plan-comptable-db-conformite      | 🔴 CRITIQUE | M      | MCP Supabase       |
| 09  | apex-2026-05-15-09-tests-e2e-coverage                | 🟡 MOYENNE  | L      | playwright         |
| 10  | apex-2026-05-15-10-deploiement-vercel                | 🟡 BASSE    | S      | DNS + secrets      |

Effort : S (≤2h), M (½ journée), L (1 journée).

## Ordre d'exécution recommandé

### Sprint 1 — Conformité métier critique (priorité user)

1. **APEX-01** Plan Comptable agrégé (résout le bug "fournisseurs non affichés")
2. **APEX-08** Plan Comptable DB conformité (vérifier comptes 6031-6037, 7071-7077)
3. **APEX-02** Initialisation layout 2 colonnes + volume auto-calculé
4. **APEX-03** Calibrage 3 règles strictes

### Sprint 2 — Architecture & permissions

5. **APEX-04** Noperations refactor + VirementInterne
6. **APEX-07** Permissions sur boutons sensibles
7. **APEX-05** Realtime doléances uniquement (ménage léger)

### Sprint 3 — Partenaire & tests

8. **APEX-06** Dashboard partenaire DIFF.md
9. **APEX-09** Tests E2E coverage

### Sprint 4 — Production

10. **APEX-10** Déploiement Vercel

### Sprint 5 — Convergence finale (boucle d'audit récursive)

11. **APEX-11** Convergence finale src/ ↔ Guide_Document_SuccessFuel.md

- Inventorie tous les items du Guide (§1-§18 + 20 règles + DIFF.md)
- Scanne `src/` pour vérifier chaque item
- Produit un rapport d'écarts horodaté
- Si écarts → corrige → relance la boucle (max 5 itérations)
- Si rapport vide → STOP, tag `convergence-2026-05-15-ok`
- Sécurité anti-boucle : escalade à l'utilisateur après 5 itérations

## Processus pour CHAQUE APEX (CLAUDE.md non négociable)

1. Lire le fichier APEX `/apex-2026-05-15-NN-...md`
2. Implémenter selon ÉTAPE 1→4
3. **Tests unitaires** : `npm run test`
4. **Tests E2E** : `npm run test:e2e`
5. **Linting** : `npm run lint` (0 erreur)
6. **TypeScript** : `npx tsc --noEmit` (0 erreur)
7. **Build** : `npm run build`
8. Commit conventionnel : `git commit -m "feat(apex-2026-05-15-NN): ..."`
9. Push : `git push`
10. Mettre à jour `guide/actions.md` (ACTION #N) et `todo.md`

## Risques & Mitigations

- **APEX-01 + 08** : modification DB. Toujours UPSERT, jamais DROP. Backup via Supabase point-in-time.
- **APEX-02** : refactor layout sensible — tester sur mobile/tablet.
- **APEX-04** : déplacement de fichiers — utiliser re-export pour ne pas casser les imports existants.
- **APEX-08** : un sous-compte mal pointé = écritures fausses. Tester chaque flux après modification.

## Critères globaux de succès

- ✅ Tous les exemples remontés par l'utilisateur résolus
- ✅ Conformité Guide §1-§18 vérifiée
- ✅ DIFF.md intégré
- ✅ 0 erreur lint, 0 erreur tsc, build vert
- ✅ Tests Vitest et Playwright passants
- ✅ guide/actions.md à jour
- ✅ Application déployée Vercel
