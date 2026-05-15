---
description: APEX 2026-05-15-07 — Audit complet et application des hasPermission() sur tous les boutons sensibles (Guide §2 + §14 règle 12)
argument-hint: <aucun — lancer directement>
priority: 🟠 HAUTE
---

<objective>
Le système de permissions granulaires (`src/lib/permissions.ts` 18 clés + `useAuth.hasPermission()`) existe.
Mais l'usage sur les pages sensibles n'est pas garanti partout.

Objectif : auditer **chaque bouton/action critique** des pages Manager et appliquer `hasPermission()` :
- Comptabiliser (achat carburant, achat boutique, salaires, etc.)
- Clôturer shift carburant
- Régulariser inventaire
- Mouvementer stock
- Créer BC
- Opérations hors A&V
- Transfert stock
- Doléances création
- Rapports financiers (cacher selon droit)
</objective>

<context>
Fichiers à analyser :
- src/lib/permissions.ts (18 clés)
- src/hooks/useAuth.ts (hasPermission)
- src/components/manager/fuel-purchase/AchatCarburantPage.tsx (995L)
- src/components/manager/fuel-sale/VenteCarburantPage.tsx (770L)
- src/components/manager/boutique-purchase/AchatBoutiquePage.tsx (1084L)
- src/components/manager/shop-sales/ManagerShopSalesPage.tsx (569L)
- src/components/manager/inventory/* (Inventaire carburant + boutique)
- src/components/manager/stock-transfer/*
- src/components/manager/doleances/DoleancesPage.tsx
- src/components/manager/noperations/* (6 dialogs)

Règle Guide §2 + §14 règle 12 :
- Droits granulaires par page/fonctionnalité — JAMAIS hiérarchiques
- Sessions employés : seulement les droits explicitement accordés
- Pages Initialisation et Users : TOUJOURS gérant uniquement
</context>

<process>
## ÉTAPE 1 — ANALYZE
Cartographier chaque bouton sensible et la permission attendue :

| Bouton | Permission | Fichier |
|---|---|---|
| Comptabiliser achat carburant | `traitement_achat_carburant_comptabiliser` | AchatCarburantPage |
| Mouvementer achat carburant | `traitement_achat_carburant_mouvementer` | idem |
| Créer BC | `traitement_achat_carburant_write` | idem |
| Clôturer shift | `traitement_vente_carburant_cloture` | VenteCarburantPage |
| POS opérer | `traitement_boutique_pos` | ManagerShopSalesPage |
| Régulariser inventaire | `traitement_inventaire_regulariser` | InventairePage |
| Transfert stock | `traitement_transfert_stock` | StockTransferPage |
| Charges/Salaires/etc. | `traitement_operations` | noperations/ |
| Doléances créer | `doleances` | DoleancesPage |

## ÉTAPE 2 — PLAN
Pour chaque bouton :
```tsx
const { hasPermission } = useAuth();
{hasPermission('traitement_achat_carburant_comptabiliser') && (
  <Button onClick={...}>Comptabiliser</Button>
)}
```

Plus : composant `<PermissionGate permission="...">` pour wrapper proprement.

## ÉTAPE 3 — EXECUTE
1. Créer `src/components/auth/PermissionGate.tsx` (rend null si pas le droit)
2. Auditer chaque page de la liste et wrapper les boutons
3. Tester avec une session_gerant ayant des droits limités
4. Vérifier RLS Supabase double check côté backend (pas seulement UX)

## ÉTAPE 4 — VALIDATE
- [ ] Session sans `traitement_achat_carburant_comptabiliser` ne voit pas le bouton
- [ ] Session sans `traitement_vente_carburant_cloture` ne voit pas le bouton clôture
- [ ] Tentative bypass URL → 403 ou redirection (vérifier RLS)
- [ ] Test unitaire : `hasPermission()` retourne false si clé absente
- [ ] Test E2E : créer session avec droits restreints, vérifier UX
</process>

<rules>
- Frontend (UX) + Backend (RLS) — double couche
- Initialisation et Users TOUJOURS gérant uniquement (pas dans permissions)
- gerant + superadmin → toutes permissions retournent true
- Pas de pattern "rôle" — uniquement clés granulaires
</rules>
