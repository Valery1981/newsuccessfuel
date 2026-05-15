---
description: APEX 2026-05-15-04 — Refactor noperations/ en sous-panneaux modulaires + ajouter VirementInternePanel
argument-hint: <aucun — lancer directement>
priority: 🟠 HAUTE
---

<objective>
Selon `apex-noperations-panels.md` originel et Guide §10.8, l'architecture cible des opérations hors A&V est :
```
src/components/manager/noperations/
├── shared/                       # PartieDoubleValidator, CompteSelector, TresorerieSelector, OperationFormBase
├── VirementInterne/              # ABSENT actuellement
├── Creances/                     # EncaissementCreancesPanel
├── Fournisseurs/                 # ReglementDettesPanel
├── ChargesCourantes/             # ChargesCourantesPanel
├── Salaires/                     # 3 étapes séquentielles
├── Gerant/                       # Capital/CC/Dividendes
└── Immobilisations/              # Acquisition + cession
```

Réalité : les sous-dossiers existent mais SONT VIDES. La logique vit dans 6 dialogs monolithiques à plat (`ChargesCourantesDialog`, `EncaissementCreancesDialog`, `ImmobilisationsDialog`, `OperationsGerantDialog`, `ReglementDettesDialog`, `SalairesDialog`). **VirementInterne n'existe PAS**.

Objectif :
1. Créer le panel `VirementInternePanel` (manquant)
2. Extraire les composants `shared/` réutilisables (PartieDoubleValidator, sélecteurs)
3. Réorganiser les dialogs existants dans leurs sous-dossiers respectifs (sans casser les imports)
</objective>

<context>
Fichiers à analyser :
- src/components/manager/noperations/ManagerNonSalesOperationsPage.tsx (568L)
- src/components/manager/noperations/*.tsx (6 dialogs)
- src/services/tresorerieService.ts, tiersService.ts
- src/components/compta/PartieDoubleCheck.tsx (existe déjà ?)
- guide/Guide_Document_SuccessFuel.md §10.8

Règles métier (§10.8) :
- Virement Interne : DÉBIT trésorerie entrante / CRÉDIT trésorerie sortante
- Encaissement Créances : DÉBIT trésorerie / CRÉDIT 411-xxx ou 460-xxx (paiement partiel OK, réf obligatoire)
- Règlement Dettes : DÉBIT 401-xxx / CRÉDIT trésorerie (partenaire = solde global ; autres = soldé à 0)
- Charges Courantes : 3 modes paiement (cash / crédit / mixte)
- Salaires : 3 étapes (avance, constatation, paiement net) → solde 421 = 0
- Opérations Gérant : Capital 101, CC 455, Dividendes 457/120
- Immobilisations : acquisition 2xxx ; cession perte 653+trés→2xxx ; cession bénéfice trés→2xxx+753
- Tri créances/dettes : échéance ↑, rouge dépassé, orange <7j, vert normal
- Partie double BLOQUANTE
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lister tous les imports de chaque dialog dans ManagerNonSalesOperationsPage.tsx
2. Repérer le code dupliqué (sélecteurs trésorerie, validation partie double)
3. Vérifier `PartieDoubleCheck.tsx` dans src/components/compta/ — peut-il devenir le `PartieDoubleValidator` partagé ?

## ÉTAPE 2 — PLAN
1. **shared/** :
   - `PartieDoubleValidator.tsx` (réutiliser/déplacer compta/PartieDoubleCheck)
   - `TresorerieSelector.tsx` (extraire le pattern Select trésorerie commun)
   - `CompteSelector.tsx` (sélecteur compte comptable affichant libellé)
   - `OperationFormBase.tsx` (champs date + libellé + station communs)

2. **Déplacer** chaque dialog existant dans son sous-dossier :
   - `noperations/ChargesCourantesDialog.tsx` → `noperations/ChargesCourantes/ChargesCourantesPanel.tsx`
   - etc. (avec re-export pour ne pas casser les imports)

3. **Créer** `noperations/VirementInterne/VirementInternePanel.tsx` :
   - 2 sélecteurs trésorerie (entrante / sortante) + montant + libellé
   - Validation : trésorerie entrante ≠ sortante
   - Génère 1 écriture : DÉBIT trésorerie entrante, CRÉDIT trésorerie sortante
   - PartieDoubleValidator confirmé avant submit
   - Mutation insère dans `ecritures_comptables` + `lignes_ecriture` en transaction

4. **Brancher** VirementInternePanel dans ManagerNonSalesOperationsPage (ajouter onglet/tab)

## ÉTAPE 3 — EXECUTE
1. Créer shared/ (4 fichiers)
2. Créer VirementInterne/VirementInternePanel.tsx
3. Modifier ManagerNonSalesOperationsPage.tsx pour inclure l'onglet
4. Optionnel (low risk) : déplacer les 6 dialogs dans leurs dossiers via re-export
5. Tests unitaires : PartieDoubleValidator (∑D=∑C), VirementInterne génère 2 lignes
6. Test E2E : créer un virement interne 100k Caisse→Banque

## ÉTAPE 4 — VALIDATE
- [ ] VirementInterne accessible depuis le hub Opérations
- [ ] Refus si trésorerie entrante = sortante
- [ ] Refus si montant ≤ 0
- [ ] Écriture générée avec ∑Débit = ∑Crédit
- [ ] PartieDoubleValidator visible et bloquant
- [ ] Tous les autres panels (Charges, Salaires, etc.) continuent de fonctionner
- [ ] Tests unitaires + E2E verts
</process>

<rules>
- Partie double BLOQUANTE — `PartieDoubleValidator` au-dessus de chaque submit
- Numéros de compte INVISIBLES (afficher libellé trésorerie : "Caisse Centrale" pas "530-001")
- Transactions Supabase ACID (insert ecriture + lignes en RPC ou transaction)
- Pas de duplication code — utiliser shared/
- Re-export pour préserver les imports existants si déplacement de fichier
</rules>
