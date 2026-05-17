"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculerControleJaugeCuve,
  grouperReceptionsParCuve,
} from "@/lib/achatCarburant";
import { formatNumber } from "@/lib/utils";
import { cuveService } from "@/services/cuveService";
import { achatCarburantService } from "@/services/achatCarburantService";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface CompartimentAffectationState {
  compartiment_id: string;
  type_carburant_id: string;
  type_carburant_label: string;
  volume_nominal: string;
  station_id: string;
  cuve_id: string;
  cuve_nom: string;
}

export interface CuveJaugeFormState {
  jauge_avant_cm: string;
  jauge_apres_cm: string;
}

export interface ReceptionCarburantFormProps {
  camionId: string;
  onChangeCamion: (id: string) => void;
  camions: Array<{
    id: string;
    numero_immat: string;
    capacite_totale: number | null;
  }>;
  dateLivraison: string;
  onDateLivraisonChange: (d: string) => void;
  numeroBl: string;
  onNumeroBlChange: (v: string) => void;
  compartiments: CompartimentAffectationState[];
  onCompartimentsChange: (lignes: CompartimentAffectationState[]) => void;
  jaugesParCuve: Record<string, CuveJaugeFormState>;
  onJaugesParCuveChange: (jauges: Record<string, CuveJaugeFormState>) => void;
  stations: Array<{ id: string; nom: string }>;
  typesCarburant: Array<{ id: string; label: string }>;
}

function emptyCompartiment(): CompartimentAffectationState {
  return {
    compartiment_id: "",
    type_carburant_id: "",
    type_carburant_label: "",
    volume_nominal: "",
    station_id: "",
    cuve_id: "",
    cuve_nom: "",
  };
}

function CompartimentAffectationRow({
  ligne,
  idx,
  stations,
  typesCarburant,
  compartimentsCamion,
  usedCompartimentIds,
  onPatch,
  onRemove,
}: {
  ligne: CompartimentAffectationState;
  idx: number;
  stations: Array<{ id: string; nom: string }>;
  typesCarburant: Array<{ id: string; label: string }>;
  compartimentsCamion: Array<{ id: string; numero: number; volume_max: number }>;
  usedCompartimentIds: Set<string>;
  onPatch: (idx: number, patch: Partial<CompartimentAffectationState>) => void;
  onRemove: (idx: number) => void;
}) {
  const { data: cuves = [] } = useQuery({
    queryKey: ["cuves-reception", ligne.station_id],
    queryFn: () =>
      ligne.station_id
        ? cuveService.getCuvesByStation(ligne.station_id)
        : Promise.resolve([]),
    enabled: !!ligne.station_id,
  });

  const compartiment = compartimentsCamion.find((c) => c.id === ligne.compartiment_id);

  return (
    <div className="rounded-lg border p-3 space-y-2 mb-2">
      <div className="flex justify-between items-center">
        <p className="text-xs font-medium text-muted-foreground">
          Compartiment {compartiment ? `n° ${compartiment.numero}` : "—"}
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onRemove(idx)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div>
          <Label className="text-xs">Compartiment *</Label>
          <Select
            value={ligne.compartiment_id}
            onValueChange={(v) => {
              const c = compartimentsCamion.find((x) => x.id === v);
              onPatch(idx, {
                compartiment_id: v ?? "",
                volume_nominal: c ? String(c.volume_max) : "",
              });
            }}
          >
            <SelectTrigger className="mt-0.5">
              <SelectValue placeholder="N°" />
            </SelectTrigger>
            <SelectContent>
              {compartimentsCamion.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  disabled={
                    usedCompartimentIds.has(c.id) && c.id !== ligne.compartiment_id
                  }
                >
                  N° {c.numero} — {formatNumber(c.volume_max, 0)} L
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Produit *</Label>
          <Select
            value={ligne.type_carburant_id}
            onValueChange={(v) => {
              const t = typesCarburant.find((x) => x.id === v);
              onPatch(idx, {
                type_carburant_id: v ?? "",
                type_carburant_label: t?.label ?? "",
              });
            }}
          >
            <SelectTrigger className="mt-0.5">
              <SelectValue placeholder="Carburant" />
            </SelectTrigger>
            <SelectContent>
              {typesCarburant.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Volume nominal (L) *</Label>
          <Input
            type="number"
            className="mt-0.5"
            value={ligne.volume_nominal}
            onChange={(e) => onPatch(idx, { volume_nominal: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Station *</Label>
          <Select
            value={ligne.station_id}
            onValueChange={(v) =>
              onPatch(idx, { station_id: v ?? "", cuve_id: "", cuve_nom: "" })
            }
          >
            <SelectTrigger className="mt-0.5">
              <SelectValue placeholder="Station" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cuve destinataire *</Label>
          <Select
            value={ligne.cuve_id}
            disabled={!ligne.station_id}
            onValueChange={(v) => {
              const cuve = cuves.find((c) => c.id === v);
              onPatch(idx, {
                cuve_id: v ?? "",
                cuve_nom: cuve?.nom ?? "",
                type_carburant_id:
                  cuve?.type_carburant_id ?? ligne.type_carburant_id,
              });
            }}
          >
            <SelectTrigger className="mt-0.5">
              <SelectValue placeholder="Cuve" />
            </SelectTrigger>
            <SelectContent>
              {cuves.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function CuveJaugePanel({
  cuveId,
  cuveNom,
  stationNom,
  compartiments,
  totalNominal,
  jauge,
  onJaugeChange,
}: {
  cuveId: string;
  cuveNom: string;
  stationNom: string;
  compartiments: Array<{ numero?: number; volume: number }>;
  totalNominal: number;
  jauge: CuveJaugeFormState;
  onJaugeChange: (cuveId: string, patch: Partial<CuveJaugeFormState>) => void;
}) {
  const [volAvant, setVolAvant] = useState<number | null>(null);
  const [volApres, setVolApres] = useState<number | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const jA = Number(jauge.jauge_avant_cm);
  const jAp = Number(jauge.jauge_apres_cm);
  const jaugesValid = jA >= 0 && jAp >= 0;
  const volAvantAffiche = jaugesValid ? volAvant : null;
  const volApresAffiche = jaugesValid ? volApres : null;

  useEffect(() => {
    if (!jaugesValid) return;
    let cancelled = false;
    (async () => {
      try {
        setCalcError(null);
        const va = await cuveService.getVolumeFromJauge(cuveId, jA);
        const vp = await cuveService.getVolumeFromJauge(cuveId, jAp);
        if (!cancelled) {
          setVolAvant(va);
          setVolApres(vp);
        }
      } catch {
        if (!cancelled) setCalcError("Erreur calibrage jauge");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cuveId, jauge.jauge_avant_cm, jauge.jauge_apres_cm, jaugesValid, jA, jAp]);

  const controle =
    volAvantAffiche != null && volApresAffiche != null && totalNominal > 0
      ? calculerControleJaugeCuve(volAvantAffiche, volApresAffiche, totalNominal)
      : null;

  return (
    <div className="rounded-lg border border-primary/30 bg-muted/30 p-4 space-y-3">
      <div>
        <p className="font-medium">{cuveNom}</p>
        <p className="text-xs text-muted-foreground">{stationNom}</p>
      </div>
      <p className="text-xs">
        Compartiments :{" "}
        {compartiments
          .map((c) => `n°${c.numero ?? "?"} (${formatNumber(c.volume, 0)} L)`)
          .join(", ")}
      </p>
      <p className="text-sm font-semibold">
        Total nominal livré : {formatNumber(totalNominal, 0)} L
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Jauge avant (cm) *</Label>
          <Input
            type="number"
            className="mt-0.5"
            value={jauge.jauge_avant_cm}
            onChange={(e) =>
              onJaugeChange(cuveId, { jauge_avant_cm: e.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Jauge après (cm) *</Label>
          <Input
            type="number"
            className="mt-0.5"
            value={jauge.jauge_apres_cm}
            onChange={(e) =>
              onJaugeChange(cuveId, { jauge_apres_cm: e.target.value })
            }
          />
        </div>
        <div>
          <Label className="text-xs">Vol. avant</Label>
          <p className="mt-1.5 text-sm font-medium">
            {volAvantAffiche != null ? `${formatNumber(volAvantAffiche, 1)} L` : "—"}
          </p>
        </div>
        <div>
          <Label className="text-xs">Vol. après</Label>
          <p className="mt-1.5 text-sm font-medium">
            {volApresAffiche != null ? `${formatNumber(volApresAffiche, 1)} L` : "—"}
          </p>
        </div>
      </div>
      {controle ? (
        <p className="text-xs rounded bg-background p-2">
          Écart indicatif :{" "}
          <strong>{formatNumber(controle.ecartLivraison, 1)} L</strong>
        </p>
      ) : null}
      {calcError ? (
        <p className="text-xs text-destructive">{calcError}</p>
      ) : null}
    </div>
  );
}

export function ReceptionCarburantForm({
  camionId,
  onChangeCamion,
  camions,
  dateLivraison,
  onDateLivraisonChange,
  numeroBl,
  onNumeroBlChange,
  compartiments,
  onCompartimentsChange,
  jaugesParCuve,
  onJaugesParCuveChange,
  stations,
  typesCarburant,
}: ReceptionCarburantFormProps) {
  const { data: compartimentsCamion = [], isLoading } = useQuery({
    queryKey: ["compartiments", camionId],
    queryFn: () => achatCarburantService.getCompartiments(camionId),
    enabled: !!camionId,
  });

  const usedCompartimentIds = useMemo(
    () => new Set(compartiments.map((c) => c.compartiment_id).filter(Boolean)),
    [compartiments],
  );

  const cuvesGroupees = useMemo(() => {
    const lignes = compartiments
      .filter((c) => c.cuve_id && Number(c.volume_nominal) > 0)
      .map((c) => {
        const comp = compartimentsCamion.find((x) => x.id === c.compartiment_id);
        const station = stations.find((s) => s.id === c.station_id);
        return {
          cuve_id: c.cuve_id,
          station_id: c.station_id,
          cuve_nom: c.cuve_nom || null,
          station_nom: station?.nom ?? null,
          compartiment_id: c.compartiment_id,
          compartiment_numero: comp?.numero ?? null,
          volume_nominal: Number(c.volume_nominal),
        };
      });
    return grouperReceptionsParCuve(lignes);
  }, [compartiments, compartimentsCamion, stations]);

  const handlePatchCompartiment = useCallback(
    (idx: number, patch: Partial<CompartimentAffectationState>) => {
      onCompartimentsChange(
        compartiments.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
      );
    },
    [compartiments, onCompartimentsChange],
  );

  const handleJaugeChange = useCallback(
    (cuveId: string, patch: Partial<CuveJaugeFormState>) => {
      onJaugesParCuveChange({
        ...jaugesParCuve,
        [cuveId]: {
          ...{ jauge_avant_cm: "", jauge_apres_cm: "" },
          ...jaugesParCuve[cuveId],
          ...patch,
        },
      });
    },
    [jaugesParCuve, onJaugesParCuveChange],
  );

  useEffect(() => {
    const next = { ...jaugesParCuve };
    let changed = false;
    for (const g of cuvesGroupees) {
      if (!next[g.cuve_id]) {
        next[g.cuve_id] = { jauge_avant_cm: "", jauge_apres_cm: "" };
        changed = true;
      }
    }
    if (changed) onJaugesParCuveChange(next);
  }, [cuvesGroupees, jaugesParCuve, onJaugesParCuveChange]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">1. Camion / BL</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Camion *</Label>
            <Select value={camionId} onValueChange={(v) => onChangeCamion(v ?? "")}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Camion" />
              </SelectTrigger>
              <SelectContent>
                {camions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.numero_immat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>N° BL *</Label>
            <Input
              className="mt-1"
              value={numeroBl}
              onChange={(e) => onNumeroBlChange(e.target.value)}
            />
          </div>
          <div>
            <Label>Date livraison *</Label>
            <Input
              type="date"
              className="mt-1"
              value={dateLivraison}
              onChange={(e) => onDateLivraisonChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">2. Affectation compartiments</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!camionId}
            onClick={() =>
              onCompartimentsChange([...compartiments, emptyCompartiment()])
            }
          >
            <Plus className="h-3 w-3 mr-1" />
            Compartiment
          </Button>
        </div>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {compartiments.map((ligne, idx) => (
          <CompartimentAffectationRow
            key={idx}
            ligne={ligne}
            idx={idx}
            stations={stations}
            typesCarburant={typesCarburant}
            compartimentsCamion={compartimentsCamion}
            usedCompartimentIds={usedCompartimentIds}
            onPatch={handlePatchCompartiment}
            onRemove={(i) =>
              onCompartimentsChange(compartiments.filter((_, j) => j !== i))
            }
          />
        ))}
      </div>

      {cuvesGroupees.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2">3. Contrôle jauge par cuve</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Une jauge avant et une jauge après par cuve (pas par compartiment).
          </p>
          {cuvesGroupees.map((g) => {
            const station = stations.find((s) => s.id === g.station_id);
            const cuveNom =
              compartiments.find((c) => c.cuve_id === g.cuve_id)?.cuve_nom ||
              "Cuve";
            return (
              <CuveJaugePanel
                key={g.cuve_id}
                cuveId={g.cuve_id}
                cuveNom={cuveNom}
                stationNom={station?.nom ?? "—"}
                compartiments={g.compartiments.map((c) => ({
                  numero: c.compartiment_numero,
                  volume: c.volume_nominal,
                }))}
                totalNominal={g.total_nominal_livre}
                jauge={
                  jaugesParCuve[g.cuve_id] ?? {
                    jauge_avant_cm: "",
                    jauge_apres_cm: "",
                  }
                }
                onJaugeChange={handleJaugeChange}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}