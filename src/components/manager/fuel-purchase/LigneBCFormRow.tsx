"use client";

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
  calculerMontantLigneAchatCarburant,
  PRIX_CARBURANT_ACHAT_MANQUANT,
} from "@/lib/prixCarburant";
import { formatCurrency } from "@/lib/utils";
import { prixCarburantService } from "@/services/prixCarburantService";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";

export interface LigneBCState {
  station_id: string;
  produit: string;
  quantite_commandee: string;
  prix_unitaire: string;
}

interface StationOption {
  id: string;
  nom: string;
}

interface TypeCarburantOption {
  id: string;
  label: string;
}

interface LigneBCFormRowProps {
  ligne: LigneBCState;
  idx: number;
  dateReference: string;
  stations: StationOption[];
  typesCarburant: TypeCarburantOption[];
  onChange: (idx: number, patch: Partial<LigneBCState>) => void;
}

export function LigneBCFormRow({
  ligne,
  idx,
  dateReference,
  stations,
  typesCarburant,
  onChange,
}: LigneBCFormRowProps) {
  const prixQuery = useQuery({
    queryKey: [
      "prix-achat-actif-achat",
      ligne.station_id,
      ligne.produit,
      dateReference,
    ],
    queryFn: () =>
      prixCarburantService.getPrixAchatActif({
        stationId: ligne.station_id,
        typeCarburantId: ligne.produit,
        dateReference,
      }),
    enabled: Boolean(ligne.station_id && ligne.produit && dateReference),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!ligne.station_id || !ligne.produit) {
      if (ligne.prix_unitaire !== "") {
        onChange(idx, { prix_unitaire: "" });
      }
      return;
    }
    if (prixQuery.isLoading) return;
    if (prixQuery.data) {
      const next = String(prixQuery.data.prixAchat);
      if (ligne.prix_unitaire !== next) {
        onChange(idx, { prix_unitaire: next });
      }
    } else if (!prixQuery.isLoading && ligne.prix_unitaire !== "") {
      onChange(idx, { prix_unitaire: "" });
    }
  }, [
    prixQuery.data,
    prixQuery.isLoading,
    ligne.station_id,
    ligne.produit,
    ligne.prix_unitaire,
    idx,
    onChange,
  ]);

  const qty = Number(ligne.quantite_commandee) || 0;
  const prixAchat = Number(ligne.prix_unitaire) || 0;
  const montantLigne = calculerMontantLigneAchatCarburant(qty, prixAchat);
  const needsPrix =
    Boolean(ligne.station_id && ligne.produit) && !prixQuery.isLoading;
  const prixManquant = needsPrix && !prixQuery.data;

  return (
    <div className="space-y-2 mb-4 rounded-lg border border-border/60 p-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Station</Label>
          <Select
            value={ligne.station_id}
            onValueChange={(v) =>
              onChange(idx, {
                station_id: v ?? "",
                produit: "",
                prix_unitaire: "",
              })
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
          <Label className="text-xs text-muted-foreground">Carburant</Label>
          <Select
            value={ligne.produit}
            disabled={!ligne.station_id}
            onValueChange={(v) =>
              onChange(idx, { produit: v ?? "", prix_unitaire: "" })
            }
          >
            <SelectTrigger className="mt-0.5">
              <SelectValue placeholder="Type carburant" />
            </SelectTrigger>
            <SelectContent>
              {typesCarburant.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Quantité (L)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Quantité"
            className="mt-0.5"
            value={ligne.quantite_commandee}
            onChange={(e) =>
              onChange(idx, { quantite_commandee: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
        <div>
          <Label className="text-xs text-muted-foreground">
            Prix d&apos;achat (automatique)
          </Label>
          <div className="mt-0.5 flex items-center gap-2">
            {prixQuery.isLoading && ligne.station_id && ligne.produit ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
            <Input
              type="number"
              readOnly
              tabIndex={-1}
              className="bg-muted/50 cursor-not-allowed"
              value={ligne.prix_unitaire}
              placeholder="—"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Ar/L
            </span>
          </div>
          {prixQuery.data ? (
            <p className="text-xs text-muted-foreground mt-1">
              Prix d&apos;achat automatique :{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(prixQuery.data.prixAchat)}/L
              </span>
              <span className="ml-1">
                (effet {prixQuery.data.dateEffet})
              </span>
            </p>
          ) : null}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Montant ligne</Label>
          <p className="mt-1.5 text-sm font-semibold tabular-nums">
            {montantLigne > 0 ? formatCurrency(montantLigne) : "—"}
          </p>
          {qty > 0 && prixAchat > 0 ? (
            <p className="text-xs text-muted-foreground">
              {qty.toLocaleString("fr-FR")} L × {formatCurrency(prixAchat)}/L
            </p>
          ) : null}
        </div>
      </div>

      {prixManquant ? (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {PRIX_CARBURANT_ACHAT_MANQUANT}
        </p>
      ) : null}
    </div>
  );
}
