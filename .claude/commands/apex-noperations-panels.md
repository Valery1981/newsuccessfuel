---
description: APEX — Implémenter les sous-panneaux des opérations hors achat/vente (ChargesCourantes, Créances, Fournisseurs, Gérant, Immobilisations, Salaires, VirementInterne)
argument-hint: <aucun — lancer directement>
---

<objective>
Implémenter les 7 sous-panneaux manquants de la page ManagerNonSalesOperationsPage.
Actuellement les dossiers ChargesCourantes/, Creances/, Fournisseurs/, Gerant/, Immobilisations/, Salaires/, VirementInterne/ et shared/ dans src/components/manager/noperations/ sont tous VIDES.
La page principale ManagerNonSalesOperationsPage.tsx (15k bytes) existe mais les sous-composants qui devraient y être importés sont absents.
Chaque opération génère des écritures comptables avec partie double obligatoire (∑ Débits = ∑ Crédits) vérifiée par la DB function verifier_partie_double().
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT avant tout code :
- guide/Guide_Document_SuccessFuel.md §10.8 "OPÉRATIONS HORS ACHAT & VENTE" (règles comptables précises)
- src/components/manager/noperations/ManagerNonSalesOperationsPage.tsx (page principale existante)
- src/services/tresorerieService.ts (comptes de trésorerie)
- src/services/tiersService.ts (fournisseurs 401-xxx, clients 411-xxx, employés 421-xxx/460-xxx)
- src/types/supabase.ts (types DB : ecritures_comptables, lignes_ecriture, operations_hors_av)
- src/lib/utils.ts (formatCurrency, formatDate)
- src/components/ui/ (composants shadcn disponibles)

Règles métier critiques (§10.8) :
- Virement Interne : DÉBIT Trésorerie entrante / CRÉDIT Trésorerie sortante
- Encaissement Créances : DÉBIT Trésorerie / CRÉDIT 411-xxx ou 460-xxx (paiement partiel OK, référence obligatoire)
- Règlement Dettes : DÉBIT 401-xxx / CRÉDIT Trésorerie (partenaire : solde global ; autres : soldé à 0 obligatoirement ; référence obligatoire)
- Charges Courantes : date + libellé + station/central + compte 6xxx + fournisseur (ou "Non défini") ; 3 modes cash/crédit/mixte
- Salaires étape 1 (avance ~15 du mois) : DÉBIT 421-xxx / CRÉDIT Trésorerie
- Salaires étape 2 (constatation fin mois) : DÉBIT 640 / CRÉDIT 421-xxx
- Salaires étape 3 (paiement net) : DÉBIT 421-xxx / CRÉDIT Trésorerie → Solde 421 = 0
- Charges Fiscales/Sociales : CNAPS 431, OSTIE 432, IRSA 447, TVA 4454, IR/690→444
- Opérations Gérant : Capital 101, CC 455, Dividendes 457/120
- Immobilisations : acquisition 2xxx→Trésorerie/401-xxx ; cession perte 653/Trésorerie→2xxx ; cession bénéfice Trésorerie→2xxx+753
- Tri créances/dettes : échéance croissante, Rouge (dépassé), Orange (<7j), Vert (normal)
- Partie double BLOQUANTE : ∑ Débits = ∑ Crédits sinon BLOQUÉ
</context>

<process>
## ÉTAPE 1 — ANALYZE (Exploration sans écriture de code)
1. Lire ManagerNonSalesOperationsPage.tsx en entier pour identifier :
   - Quels onglets/types sont déjà gérés dans le monolithe
   - Quels imports sont attendus (composants absents)
   - La structure des states et queries existants
2. Lire le schéma DB (src/types/supabase.ts) pour les tables : ecritures_comptables, lignes_ecriture, operations_hors_av, comptes_comptables
3. Identifier les services Supabase existants et manquants
4. Analyser les composants UI disponibles dans src/components/ui/

## ÉTAPE 2 — PLAN (Stratégie fichier par fichier)
Produire un plan listant EXACTEMENT :
- Les fichiers à créer dans chaque sous-dossier
- Les fichiers à modifier dans ManagerNonSalesOperationsPage.tsx
- Les services à créer/étendre
- L'ordre d'implémentation (shared/ en premier)

Fichiers attendus :
```
src/components/manager/noperations/
├── shared/
│   ├── PartieDoubleValidator.tsx   # Vérifie ∑ débit = ∑ crédit
│   ├── CompteSelector.tsx          # Sélecteur compte comptable (affiche nom, jamais numéro)
│   ├── TresorerieSelector.tsx      # Sélecteur compte de trésorerie
│   └── OperationFormBase.tsx       # Formulaire générique avec date/libellé/station
├── VirementInterne/
│   └── VirementInternePanel.tsx
├── Creances/
│   └── EncaissementCreancesPanel.tsx
├── Fournisseurs/
│   └── ReglementDettesPanel.tsx
├── ChargesCourantes/
│   └── ChargesCourantesPanel.tsx
├── Salaires/
│   └── SalairesPanel.tsx
├── Gerant/
│   └── OperationsGerantPanel.tsx
└── Immobilisations/
    └── ImmobilisationsPanel.tsx
```

## ÉTAPE 3 — EXECUTE (Implémentation todo par todo)
Ordre d'implémentation :
1. shared/PartieDoubleValidator.tsx — composant de vérification ∑ débit = ∑ crédit
2. shared/TresorerieSelector.tsx — sélecteur trésorerie
3. shared/OperationFormBase.tsx — base commune à tous les formulaires
4. VirementInterne/VirementInternePanel.tsx — le plus simple
5. Creances/EncaissementCreancesPanel.tsx — avec liste triée par échéance + couleurs
6. Fournisseurs/ReglementDettesPanel.tsx — logique partenaire vs non-partenaire
7. ChargesCourantes/ChargesCourantesPanel.tsx — 3 modes paiement
8. Salaires/SalairesPanel.tsx — 3 étapes séquentielles
9. Gerant/OperationsGerantPanel.tsx — opérations capital/CC/dividendes
10. Immobilisations/ImmobilisationsPanel.tsx — acquisition et cession
11. Refactorer ManagerNonSalesOperationsPage.tsx pour importer les sous-panneaux

Règles d'implémentation :
- Chaque panel : useQuery TanStack Query pour les listes, useMutation pour les écritures
- Toast sonner sur succès/erreur
- Skeleton shadcn/ui pendant chargement
- Dialog de confirmation avant toute écriture comptable irréversible
- Numéros de compte JAMAIS affichés (afficher libellé uniquement)
- Couleurs échéances : cn("text-red-500") dépassé, cn("text-amber-500") <7j, cn("text-green-500") normal

## ÉTAPE 4 — VALIDATE
- [ ] PartieDoubleValidator bloque si ∑ débit ≠ ∑ crédit
- [ ] Chaque panel génère les bonnes écritures (tester avec supabase mock)
- [ ] Tri créances/dettes par échéance croissante avec codes couleur corrects
- [ ] Règlement dettes non-partenaire force solde à 0
- [ ] Salaires : les 3 étapes sont séquentielles (étape 2 bloquée si étape 1 non faite)
- [ ] Numéros de compte invisibles dans toute l'UI
- [ ] TypeScript strict (0 erreur tsc --noEmit)
- [ ] Tests unitaires : ajouter tests pour logique partie double et calcul salaires
</process>

<rules>
- Suivre EXACTEMENT les écritures comptables du §10.8 du Guide Document
- La partie double est BLOQUANTE — jamais de bypass
- Les numéros de compte ne doivent JAMAIS apparaître dans l'UI (sauf Grand Livre/Balance)
- Utiliser exclusivement TanStack Query pour le data fetching
- Tous les textes en FRANÇAIS
- Responsive mobile-first
- Pas de code dupliqué — utiliser les composants shared/
- Chaque écriture dans une transaction SQL (ACID)
</rules>
