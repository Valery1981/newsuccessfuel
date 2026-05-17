"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AchatCarburantDetail } from "@/services/achatCarburantService";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

interface AchatBLRecapProps {
  detail: AchatCarburantDetail;
}

export function AchatBLRecap({ detail }: AchatBLRecapProps) {
  const totalReception = detail.receptions.reduce((s, r) => s + r.montant_ligne, 0);

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-muted-foreground text-xs">N° BC</p>
          <p className="font-mono font-medium">{detail.numero_bc}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">N° BL</p>
          <p className="font-mono font-medium">{detail.numero_bl ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Fournisseur</p>
          <p className="font-medium">{detail.fournisseur_nom ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Camion</p>
          <p className="font-medium">{detail.camion_immat ?? "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          Commande : {formatDate(detail.date_commande)}
        </Badge>
        {detail.date_livraison ? (
          <Badge variant="outline">
            Livraison : {formatDate(detail.date_livraison)}
          </Badge>
        ) : null}
        {detail.mouvemente ? (
          <Badge className="bg-blue-600 text-white">Mouvementé</Badge>
        ) : null}
        {detail.comptabilise ? (
          <Badge className="bg-green-600 text-white">Comptabilisé</Badge>
        ) : null}
      </div>

      {detail.lignes_bc.length > 0 ? (
        <div>
          <p className="font-medium mb-2">Bon de commande (indicatif)</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Carburant</TableHead>
                <TableHead className="text-right">Qté commandée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.lignes_bc.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.station_nom ?? "—"}</TableCell>
                  <TableCell>{l.type_label ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(l.quantite_commandee ?? 0, 0)} L
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {detail.receptions.length > 0 ? (
        <div className="space-y-4">
          <p className="font-medium">Réception — volumes nominaux par compartiment</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Cuve</TableHead>
                <TableHead>Cpt.</TableHead>
                <TableHead className="text-right">Vol. nominal</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.receptions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.station_nom ?? "—"}</TableCell>
                  <TableCell>{r.cuve_nom ?? "—"}</TableCell>
                  <TableCell>
                    {r.compartiment_numero != null
                      ? `N° ${r.compartiment_numero}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(r.volume_nominal, 0)} L
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.prix_achat_unitaire ?? 0)}/L
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.montant_ligne)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {detail.receptions_par_cuve.length > 0 ? (
            <div>
              <p className="font-medium mb-2">
                Contrôle jauge par cuve (indicatif)
              </p>
              {detail.receptions_par_cuve.map((g) => (
                <div
                  key={g.cuve_id}
                  className="rounded border p-3 mb-2 bg-muted/30 text-xs space-y-1"
                >
                  <p className="font-medium">
                    {g.cuve_nom ?? "Cuve"} — {g.station_nom ?? ""}
                  </p>
                  <p>
                    Compartiments :{" "}
                    {g.compartiments
                      .map(
                        (c) =>
                          `n°${c.compartiment_numero ?? "?"} (${formatNumber(c.volume_nominal, 0)} L)`,
                      )
                      .join(", ")}
                  </p>
                  <p>
                    Total nominal livré :{" "}
                    <strong>{formatNumber(g.total_nominal_livre, 0)} L</strong>
                  </p>
                  <p>
                    Jauge : {g.jauge_avant_cm ?? "—"} cm →{" "}
                    {g.jauge_apres_cm ?? "—"} cm
                    {g.volume_avant_litres != null &&
                    g.volume_apres_litres != null
                      ? ` (${formatNumber(g.volume_avant_litres, 1)} → ${formatNumber(g.volume_apres_litres, 1)} L)`
                      : ""}
                  </p>
                  <p>
                    Écart indicatif :{" "}
                    {g.ecart_indicatif != null
                      ? `${formatNumber(g.ecart_indicatif, 1)} L`
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-right font-medium">
            Total facturé (nominal) : {formatCurrency(totalReception)}
          </p>
        </div>
      ) : null}

      {detail.paiements.length > 0 ? (
        <div>
          <p className="font-medium mb-2">Paiements (réf. BC)</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Trésorerie</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.paiements.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.date_paiement)}</TableCell>
                  <TableCell>{p.tresorerie_libelle ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.montant)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-right text-muted-foreground mt-1">
            Total payé : {formatCurrency(detail.total_paye)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
