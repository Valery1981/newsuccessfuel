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
import { format, startOfMonth, startOfYear, subDays } from "date-fns";
import { Filter, RotateCcw } from "lucide-react";
import { useState } from "react";

export interface ReportFilterValues {
  dateDebut: string;
  dateFin: string;
  stationId: string;
}

interface Station {
  id: string;
  nom: string;
}

interface ReportFiltersProps {
  stations: Station[];
  values: ReportFilterValues;
  onChange: (values: ReportFilterValues) => void;
  showStation?: boolean;
}

const PERIODES = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 derniers jours", value: "7d" },
  { label: "30 derniers jours", value: "30d" },
  { label: "Ce mois", value: "month" },
  { label: "Cette année", value: "year" },
  { label: "Personnalisé", value: "custom" },
];

export function ReportFilters({
  stations,
  values,
  onChange,
  showStation = true,
}: ReportFiltersProps) {
  const [periodePreset, setPeriodePreset] = useState("30d");

  function applyPreset(preset: string) {
    const today = format(new Date(), "yyyy-MM-dd");
    let debut = today;
    if (preset === "today") debut = today;
    else if (preset === "7d")
      debut = format(subDays(new Date(), 7), "yyyy-MM-dd");
    else if (preset === "30d")
      debut = format(subDays(new Date(), 30), "yyyy-MM-dd");
    else if (preset === "month")
      debut = format(startOfMonth(new Date()), "yyyy-MM-dd");
    else if (preset === "year")
      debut = format(startOfYear(new Date()), "yyyy-MM-dd");
    else return; // custom: don't override
    setPeriodePreset(preset);
    onChange({ ...values, dateDebut: debut, dateFin: today });
  }

  function reset() {
    const today = format(new Date(), "yyyy-MM-dd");
    const debut = format(subDays(new Date(), 30), "yyyy-MM-dd");
    setPeriodePreset("30d");
    onChange({ dateDebut: debut, dateFin: today, stationId: "" });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-1.5">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Filtres
        </span>
      </div>

      {/* Période rapide */}
      <div className="space-y-1">
        <Label className="text-xs">Période</Label>
        <Select
          value={periodePreset}
          onValueChange={(v: string | null) => applyPreset(v ?? "30d")}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODES.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dates personnalisées */}
      {periodePreset === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              value={values.dateDebut}
              onChange={(e) =>
                onChange({ ...values, dateDebut: e.target.value })
              }
              className="h-8 text-xs w-[140px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              value={values.dateFin}
              onChange={(e) => onChange({ ...values, dateFin: e.target.value })}
              className="h-8 text-xs w-[140px]"
            />
          </div>
        </>
      )}

      {/* Station */}
      {showStation && stations.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Station</Label>
          <Select
            value={values.stationId || "__all__"}
            onValueChange={(v: string | null) =>
              onChange({
                ...values,
                stationId: v === "__all__" ? "" : (v ?? ""),
              })
            }
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue>
                {(values.stationId || "__all__") !== "__all__"
                  ? stations.find((s) => s.id === values.stationId)?.nom
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">
                Toutes les stations
              </SelectItem>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        className="h-8 gap-1 text-xs"
      >
        <RotateCcw className="w-3 h-3" />
        Réinitialiser
      </Button>
    </div>
  );
}
