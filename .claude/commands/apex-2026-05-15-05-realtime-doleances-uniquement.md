---
description: APEX 2026-05-15-05 — Limiter Supabase Realtime aux doléances uniquement (Guide §14 règle 14)
argument-hint: <aucun — lancer directement>
priority: 🟡 MOYENNE
---

<objective>
Guide §14 règle 14 + CLAUDE.md règle 14 : *"Supabase Realtime : UNIQUEMENT pour doléances — ne pas surcharger"*.

Audit : `src/hooks/useRealtimeStock.ts` existe et viole cette règle.

Objectif : retirer/désactiver les abonnements Realtime hors doléances et confirmer que `NotificationCenter` ne s'abonne qu'aux doléances.
</objective>

<context>
Fichiers à analyser :
- src/hooks/useRealtimeNotifications.ts
- src/hooks/useRealtimeStock.ts
- src/components/messaging/NotificationCenter.tsx
- src/services/notificationService.ts
- guide/Guide_Document_SuccessFuel.md §14 règle 14, §18

Justification : Realtime est coûteux côté Supabase (pricing + IOPS). Doléances seules nécessitent push live (workflow station↔partenaire).
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Identifier toutes les utilisations de `supabase.channel(...)` ou `.on('postgres_changes', ...)` dans src/
2. Lister les hooks Realtime et les pages qui les utilisent
3. Vérifier que les stocks sont rafraîchis via TanStack Query (refetchInterval ou invalidation après mutation)

## ÉTAPE 2 — PLAN
1. Supprimer ou désactiver `useRealtimeStock.ts`
2. Remplacer dans les pages qui l'utilisent par :
   - `queryClient.invalidateQueries({ queryKey: ['stocks'] })` après mutations
   - ou `useQuery({ refetchInterval: 60_000 })` si polling acceptable
3. Conserver UNIQUEMENT `useRealtimeNotifications` filtré sur table `doleances`
4. Mettre à jour `rules_supabase_base.md` si une règle Realtime y est référencée

## ÉTAPE 3 — EXECUTE
1. `git grep` les usages de `useRealtimeStock` → adapter
2. Supprimer le fichier hook (ou le marquer @deprecated)
3. Vérifier `NotificationCenter` : channel sur `doleances` uniquement
4. Documenter la règle dans `guide/rules.md` si absente

## ÉTAPE 4 — VALIDATE
- [ ] Aucun `supabase.channel` hors doléances dans le code
- [ ] Stocks rafraîchis correctement après mutations (invalidation)
- [ ] Test E2E : créer une vente → stock visible mis à jour après refetch
- [ ] Test E2E : créer une doléance partenaire → notification arrive station
</process>

<rules>
- ZÉRO Realtime hors doléances
- Préférer invalidation TanStack Query pour les rafraîchissements
- Polling 60s acceptable si UX nécessite fraîcheur
</rules>
