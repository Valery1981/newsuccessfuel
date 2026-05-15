---
description: APEX 2026-05-15-03 — Validation stricte des 3 règles de calibrage cuves (Guide §7 sous-étape 3.2)
argument-hint: <aucun — lancer directement>
priority: 🟠 HAUTE
---

<objective>
Guide §7 sous-étape 3.2 — Calibrage d'une cuve, 3 règles strictes :
1. **Règle 1** : la dernière jauge saisie doit être ≥ capacité maximale de la cuve
2. **Règle 2** : chaque volume suivant doit être strictement supérieur au précédent (croissance monotone)
3. **Règle 3** : pas de doublons (ni hauteur, ni volume)

Plus : import calibrage (PNG/PDF/JPG/JPEG) avec autocomplétion + signalement points non conformes (l'autocomplétion s'effectue même si certaines valeurs sont incorrectes — l'utilisateur corrige ensuite).

Audit : `FuelTankCalibrationPage.tsx` (999L) et `CalibrageImporter.tsx` existent. Vérifier conformité exacte aux 3 règles + comportement de l'import.
</objective>

<context>
Fichiers à analyser :
- src/components/onboarding/FuelTankCalibrationPage.tsx
- src/components/common/CalibrageImporter.tsx
- supabase/functions/import-calibrage/index.ts (edge function)
- src/services/cuveService.ts (saveCalibrages)
- guide/Guide_Document_SuccessFuel.md §7 sous-étape 3.2 + §14 règle 18

Règles strictes :
- 1 cm à 300 cm point par point
- Bouton "Calibrer" → après calibrage → statut "Calibré ✓"
- Étape suivante BLOQUÉE tant que toutes les cuves ne sont pas calibrées
- Import : extraire UNIQUEMENT le tableau de calibrage du fichier (ignorer le reste)
- Autocomplétion = jamais validation
- Erreurs signalées sur les points non conformes
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire FuelTankCalibrationPage.tsx pour identifier validations existantes
2. Vérifier les fonctions de validation (croissance, doublons, capacité)
3. Lire CalibrageImporter.tsx + edge function pour vérifier l'extraction
4. Vérifier le bouton "Calibrer" → statut "Calibré ✓"
5. Vérifier le blocage de l'étape suivante

## ÉTAPE 2 — PLAN
Ajouter (si manquant) :
- `validateCalibrage(calibrages, capaciteMax)` : retourne `{ valid: boolean, errors: { index, type, message }[] }`
  - Type erreur : `derniere_jauge_inferieure_capacite`, `volume_non_croissant`, `doublon_hauteur`, `doublon_volume`
- Affichage erreur **par point** (badge rouge sur la ligne fautive + tooltip explicatif)
- Empêcher save si erreurs
- Statut cuve : `non_calibree` / `en_cours` / `calibree`
- Blocage navigation `next` tant que `!cuves.every(c => c.statut === 'calibree')`
- Import : appel edge function → autocomplétion → validation → highlight des points non conformes

## ÉTAPE 3 — EXECUTE
1. Extraire la logique de validation dans `src/lib/calibrageValidation.ts` (testable unitairement)
2. Ajouter tests unitaires Vitest pour les 3 règles
3. Brancher dans FuelTankCalibrationPage avec affichage erreurs par point
4. Vérifier blocage du bouton "Suivant" / "Étape suivante"
5. Vérifier post-import : autocomplétion remplit + erreurs visibles

## ÉTAPE 4 — VALIDATE
- [ ] Saisir 290 cm sur cuve 1000L (devrait être ≥ vol max) → erreur Règle 1
- [ ] Saisir volume décroissant (ex: 100→90) → erreur Règle 2
- [ ] Saisir 2 fois la même hauteur → erreur Règle 3
- [ ] Bouton "Suivant" reste désactivé tant que des erreurs subsistent
- [ ] Import PDF/PNG → tableau extrait → autocomplétion + erreurs signalées
- [ ] Statut "Calibré ✓" visible après save valide
- [ ] Tests unitaires `validateCalibrage` : 6 cas (3 valides, 3 invalides)
</process>

<rules>
- 3 règles BLOQUANTES — pas de bypass
- Erreurs affichées AU POINT (pas globalement) pour clarté
- Import : extraire UNIQUEMENT le tableau (pas le texte décoratif autour)
- Autocomplétion ≠ validation (l'utilisateur doit corriger)
- Pas de saisie volume dérivable manuellement — il provient soit du calibrage, soit de l'interpolation
</rules>
