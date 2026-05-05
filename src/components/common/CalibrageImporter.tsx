"use client";

import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Importateur de tableau de calibrage cuves (§5.5-09 + §6.6 rules.md).
 *
 * Cette version implémente l'import via :
 *  1. Upload fichier CSV / TXT (parse côté client)
 *  2. Coller-coller manuel d'un tableau (TSV / CSV / espaces)
 *
 * NB : l'OCR PNG/PDF/JPG via Edge Function Supabase est l'objectif final
 * (§5.4 `/functions/import-calibrage`) — non implémenté ici (sous-projet OCR).
 *
 * Règles §6.6 vérifiées en sortie :
 *  - Volumes strictement croissants (croissance monotone)
 *  - Pas de doublons hauteur/volume
 *  - Affichage des erreurs sans bloquer l'autocomplétion (§6.6)
 */

export interface CalibragePoint {
  hauteur_cm: number;
  volume_litres: number;
  /** Ligne source (1-indexed) — utile pour signaler erreurs */
  sourceLine: number;
  /** Erreurs sur ce point (volumes décroissants, doublons, parse) */
  errors?: string[];
}

export interface CalibrageImporterProps {
  /** Capacité maximale de la cuve — pour vérifier dernière jauge ≥ capacité */
  capaciteMax?: number;
  /** Callback appelé avec les points parsés (incluant erreurs locales) */
  onImport: (points: CalibragePoint[]) => void;
  className?: string;
}

/** Parse un texte (CSV/TSV/espaces) en lignes [hauteur, volume]. Tolérant. */
export function parseCalibrageText(raw: string): CalibragePoint[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l, i) => ({ raw: l.trim(), idx: i + 1 }))
    .filter((l) => l.raw.length > 0 && !/^[#-]/.test(l.raw)); // ignore vide & commentaires

  const points: CalibragePoint[] = [];
  for (const { raw: line, idx } of lines) {
    // Détection séparateur primaire :
    // - Si ; ou \t présent → séparateur, et `,` = décimal FR
    // - Sinon → split par espace ou virgule
    const hasStrongSep = /[;\t]/.test(line);
    const splitter = hasStrongSep ? /[\t;]/ : /[,\s]+/;
    const parts = line
      .split(splitter)
      .map((p) => {
        const cleaned = p.replace(/[^0-9.,-]/g, "");
        return hasStrongSep ? cleaned.replace(",", ".") : cleaned;
      })
      .filter((p) => p.length > 0);

    if (parts.length < 2) {
      points.push({
        hauteur_cm: 0,
        volume_litres: 0,
        sourceLine: idx,
        errors: ["Ligne illisible — format attendu : hauteur volume"],
      });
      continue;
    }

    const hauteur = Number.parseFloat(parts[0]);
    const volume = Number.parseFloat(parts[1]);
    const errs: string[] = [];
    if (!Number.isFinite(hauteur) || hauteur < 0) errs.push("Hauteur invalide");
    if (!Number.isFinite(volume) || volume < 0) errs.push("Volume invalide");

    points.push({
      hauteur_cm: hauteur,
      volume_litres: volume,
      sourceLine: idx,
      errors: errs.length > 0 ? errs : undefined,
    });
  }

  // Validation §6.6 : croissance monotone + pas de doublons
  const seenHauteurs = new Set<number>();
  const seenVolumes = new Set<number>();
  let lastVolume = -Infinity;
  for (const p of points) {
    if (p.errors && p.errors.length > 0) continue;
    const errs: string[] = [];
    if (seenHauteurs.has(p.hauteur_cm))
      errs.push(`Hauteur ${p.hauteur_cm} déjà utilisée`);
    if (seenVolumes.has(p.volume_litres))
      errs.push(`Volume ${p.volume_litres} déjà utilisé`);
    if (p.volume_litres <= lastVolume)
      errs.push(
        `Volume non strictement croissant (${p.volume_litres} ≤ ${lastVolume})`,
      );
    seenHauteurs.add(p.hauteur_cm);
    seenVolumes.add(p.volume_litres);
    lastVolume = p.volume_litres;
    if (errs.length > 0) p.errors = [...(p.errors ?? []), ...errs];
  }

  return points;
}

export function CalibrageImporter({
  capaciteMax,
  onImport,
  className,
}: CalibrageImporterProps) {
  const [text, setText] = useState("");
  const [points, setPoints] = useState<CalibragePoint[]>([]);

  const handleParse = (raw: string) => {
    const parsed = parseCalibrageText(raw);
    setPoints(parsed);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    handleParse(content);
  };

  const handleApply = () => {
    onImport(points);
  };

  const totalErrors = points.filter(
    (p) => p.errors && p.errors.length > 0,
  ).length;
  const lastVolume =
    points.length > 0 ? points[points.length - 1].volume_litres : 0;
  const capaciteOK = !capaciteMax || lastVolume >= capaciteMax;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Importer un calibrage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="calibrage-file">
            Fichier CSV / TXT (hauteur, volume)
          </Label>
          <input
            id="calibrage-file"
            type="file"
            accept=".csv,.txt,.tsv,text/plain,text/csv"
            onChange={handleFile}
            className="block text-sm w-full file:mr-3 file:py-1 file:px-3 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium hover:file:bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="calibrage-text">Ou coller un tableau</Label>
          <Textarea
            id="calibrage-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleParse(e.target.value);
            }}
            placeholder={"0\t0\n10\t150\n20\t320\n..."}
            rows={6}
            className="font-mono text-xs"
          />
        </div>

        {points.length > 0 && (
          <div
            className={cn(
              "rounded-md border p-3 text-sm space-y-1",
              totalErrors > 0
                ? "border-destructive/40 bg-destructive/5"
                : "border-green-500/30 bg-green-500/5",
            )}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              {totalErrors === 0 ? (
                <CheckCircle2
                  className="h-4 w-4 text-green-600"
                  aria-hidden="true"
                />
              ) : (
                <AlertTriangle
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
                />
              )}
              {points.length} point{points.length > 1 ? "s" : ""} détecté
              {points.length > 1 ? "s" : ""}
              {totalErrors > 0 && (
                <span className="text-destructive">
                  ({totalErrors} avec erreur{totalErrors > 1 ? "s" : ""})
                </span>
              )}
            </div>
            {capaciteMax && !capaciteOK && (
              <p className="text-xs text-destructive">
                ⚠ Dernier volume {lastVolume} L &lt; capacité {capaciteMax} L
                (§6.6 règle 1)
              </p>
            )}
            {totalErrors > 0 && (
              <ul className="text-xs text-destructive list-disc ml-4 max-h-32 overflow-auto">
                {points
                  .filter((p) => p.errors && p.errors.length > 0)
                  .slice(0, 10)
                  .map((p) => (
                    <li key={p.sourceLine}>
                      Ligne {p.sourceLine} : {p.errors!.join(", ")}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={points.length === 0}
          className="w-full"
        >
          Appliquer {points.length > 0 ? `(${points.length} points)` : ""}
        </Button>
      </CardContent>
    </Card>
  );
}
