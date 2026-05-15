---
description: APEX 2026-05-15-02 — Initialisation 2 colonnes + onglet Cuves volume auto-calculé via calibrages (Guide §9 + §10.2 ligne 418)
argument-hint: <aucun — lancer directement>
priority: 🔴 CRITIQUE
---

<objective>
Deux problèmes cumulés sur `CompanyInitialisationPage.tsx` (1091L) :

1. **Layout** : actuellement single column (Tabs au-dessus, Synthèse en dessous lignes 946-1033).
   Demande : layout 2 colonnes — **gauche = Synthèse bilan d'ouverture (sticky)**, **droite = Tabs (cuves, pistolets, stock-boutique, trésorerie, créances, dettes, immobilisations)**.

2. **Onglet Cuves — Volume saisi manuellement** (ligne 552) :
   ```tsx
   value={cuveJauges[cuve.id]?.volume_litres ?? ""}
   onChange={(e) => setCuveJauges({...volume_litres: e.target.value})}
   ```
   Guide §10.2 ligne 418 : *"Jauge (cm) → Volume (litres) calculé via calibrages → Valorisation auto"*.
   Le volume DOIT être calculé automatiquement à partir de la jauge en cm, en utilisant les calibrages saisis lors de l'onboarding (`FuelTankCalibrationPage`).
</objective>

<context>
Fichiers à analyser :
- src/components/manager/initialisation/CompanyInitialisationPage.tsx (lignes 494-1033)
- src/components/onboarding/FuelTankCalibrationPage.tsx (calibrages saisis)
- src/services/cuveService.ts (méthodes `getVolumeFromJauge` via RPC, `getCuvesByStation` avec calibrages)
- src/lib/utils.ts (`interpolateVolume()` mirror JS de `get_volume_from_jauge()`)
- src/components/common/StockJauge.tsx (référence visuelle)
- guide/Guide_Document_SuccessFuel.md §9 (Initialisation), §10.2 (calcul jauge→volume), §10.6 (inventaire utilise même logique)

Données disponibles :
- Table `calibrages` : (cuve_id, hauteur_cm, volume_litres) pré-rempli pendant onboarding
- Function SQL `get_volume_from_jauge(p_cuve_id, p_jauge_cm)` retourne le volume interpolé
- JS mirror `interpolateVolume(calibrages, jauge_cm)`

Règle Guide §14 #4 : "Jauge → Volume : toujours via get_volume_from_jauge() (interpolation linéaire calibrages)"
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire CompanyInitialisationPage.tsx en entier pour cartographier les états
2. Vérifier que `cuveService.getCuvesByStation(stationId)` retourne bien les calibrages joints
3. Confirmer que `interpolateVolume()` existe dans src/lib/utils.ts
4. Vérifier la sticky positioning compatible avec le layout PageContainer existant

## ÉTAPE 2 — PLAN
**A. Refactor layout (lignes 442-1091)** :
```tsx
<PageContainer>
  <PageHeader ... />
  <Alert irreversible />
  <Card station selector />

  <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
    {/* Colonne droite (lg) ou en bas (mobile) : Tabs */}
    <div className="order-2 lg:order-1">
      <Tabs ...>...</Tabs>
    </div>
    {/* Colonne gauche (lg) ou en haut (mobile) : Synthèse sticky */}
    <aside className="order-1 lg:order-2 lg:sticky lg:top-4 self-start">
      <SyntheseBilanCard ... />
    </aside>
  </div>

  <Dialog confirmValidate ... />
</PageContainer>
```

NB : sur mobile (< lg), la synthèse remonte au-dessus pour visibilité immédiate.

**B. Onglet Cuves — auto-calcul volume** :
1. Charger les calibrages avec les cuves :
   ```typescript
   const { data: cuvesAvecCalibrages } = useQuery({
     queryKey: ['cuves-calibrages', selectedStation],
     queryFn: () => cuveService.getCuvesByStation(selectedStation),
   });
   ```
2. Remplacer l'input "Volume (L)" par un **affichage en lecture seule calculé** :
   ```tsx
   <div className="space-y-1">
     <Label className="text-xs">Volume (L) — calculé</Label>
     <div className="h-9 px-3 flex items-center rounded-md border bg-muted text-sm font-medium">
       {jaugeCm > 0
         ? formatNumber(interpolateVolume(cuve.calibrages, jaugeCm)) + ' L'
         : '—'}
     </div>
   </div>
   ```
3. Mettre à jour `cuveJauges[cuve.id].volume_litres` automatiquement via `useEffect` ou calcul dérivé au moment du save.
4. Ajouter un message d'avertissement si la cuve n'a pas de calibrages (ne devrait jamais arriver — onboarding bloque).

**C. Synthèse réactive** :
- La carte Synthèse doit recalculer en temps réel quand l'utilisateur change une jauge → volume → valorisation (jauge × prix achat × CMUP).
- Capital Net = Total Actif (stocks + trésoreries + créances + immo) − Total Dettes
- Capitaux propres nets = 101 + 120
- Utiliser `useMemo` pour éviter recalculs excessifs

## ÉTAPE 3 — EXECUTE
1. Créer un sous-composant `<SyntheseBilanInitialisation />` dans le même dossier
2. Refactor le JSX racine pour la grille 2 colonnes
3. Modifier l'onglet Cuves pour calcul auto via `interpolateVolume()`
4. Ajouter `useMemo` pour recalculer la synthèse à chaque changement
5. Garder `cuveJauges[cuve.id].volume_litres` synchronisé pour la mutation save

## ÉTAPE 4 — VALIDATE
- [ ] Layout 2 colonnes en lg, stack vertical en mobile
- [ ] Synthèse sticky reste visible en scrollant la colonne droite
- [ ] Saisir jauge_cm → Volume affiché immédiatement (interpolé)
- [ ] Volume non éditable (lecture seule)
- [ ] Saisir prix achat → Synthèse recalcule la valorisation
- [ ] Aucune cuve sans calibrages (sinon afficher erreur claire)
- [ ] Test unitaire : `interpolateVolume()` cas linéaire + bornes
- [ ] Test E2E : initialisation cuve → volume auto-calculé
</process>

<rules>
- TOUJOURS utiliser `interpolateVolume()` ou RPC `get_volume_from_jauge()` — jamais saisie manuelle volume
- Volume affiché mais non éditable
- Layout responsive : grille 2 cols seulement à partir de lg (≥1024px)
- Synthèse en sticky `top-4` à gauche en lg, au-dessus en mobile
- Ne pas casser la mutation existante `saveCuvesMutation` — juste alimenter `volume_litres` automatiquement
</rules>
