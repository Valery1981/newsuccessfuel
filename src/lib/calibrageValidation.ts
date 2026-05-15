/**
 * APEX 2026-05-15-03 — Validation stricte des 3 règles de calibrage cuves
 * Source : guide/Guide_Document_SuccessFuel.md §7 sous-étape 3.2 + §14 règle 17/18
 *
 * Règle 1 : la dernière jauge saisie doit être ≥ capacité maximale de la cuve
 * Règle 2 : chaque volume suivant doit être strictement supérieur au précédent (monotone)
 * Règle 3 : pas de doublons (ni hauteur, ni volume)
 *
 * Logique extraite de FuelTankCalibrationPage.tsx pour être testable unitairement.
 */

export interface CalibrationPoint {
  hauteur_cm: number;
  volume_litres: number;
  erreur?: string | null;
}

/**
 * Valide une liste de points de calibrage et retourne la même liste
 * avec un champ `erreur` rempli pour chaque point en infraction.
 *
 * @param points liste des points (hauteur croissante attendue)
 * @param capaciteMax capacité maximale de la cuve en litres (Règle 1)
 */
export function validateCalibrationPoints(
  points: CalibrationPoint[],
  capaciteMax: number | null,
): CalibrationPoint[] {
  // Règle 2 + 3 : monotone strict en hauteur ET en volume + pas de doublons
  const withErrors = points.map((pt, i) => {
    if (pt.hauteur_cm < 1)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm invalide — minimum 1 cm (ligne ${i + 1})`,
      };
    if (i === 0) return { ...pt, erreur: null };
    const prev = points[i - 1];
    if (pt.hauteur_cm === prev.hauteur_cm)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm dupliquée (ligne ${i + 1})`,
      };
    if (pt.hauteur_cm < prev.hauteur_cm)
      return {
        ...pt,
        erreur: `Hauteur ${pt.hauteur_cm} cm < ${prev.hauteur_cm} cm (ligne ${i + 1}) — doit être strictement supérieure`,
      };
    if (pt.volume_litres === prev.volume_litres)
      return {
        ...pt,
        erreur: `Volume ${pt.volume_litres} L dupliqué (ligne ${i + 1})`,
      };
    if (pt.volume_litres <= prev.volume_litres)
      return {
        ...pt,
        erreur: `Volume ${pt.volume_litres} L ≤ ${prev.volume_litres} L (ligne ${i + 1}) — doit être strictement supérieur`,
      };
    return { ...pt, erreur: null };
  });

  // Règle 1 : dernière jauge ≥ capacité max
  return withErrors.map((pt, i, arr) => {
    if (i === arr.length - 1 && capaciteMax && pt.volume_litres < capaciteMax)
      return {
        ...pt,
        erreur: `Dernier volume (${pt.volume_litres} L) < capacité max (${capaciteMax} L) — Règle 1`,
      };
    return pt;
  });
}

/**
 * Retourne `true` si tous les points sont valides selon les 3 règles.
 */
export function isCalibrationValid(
  points: CalibrationPoint[],
  capaciteMax: number | null,
): boolean {
  if (points.length < 2) return false;
  const validated = validateCalibrationPoints(points, capaciteMax);
  return validated.every((p) => !p.erreur);
}
