"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/adminService";

export function AdminRevenuePage() {
  const { data: abonnements, isLoading } = useQuery({
    queryKey: ["admin-abonnements-revenue"],
    queryFn: () => adminService.getAllAbonnements(0, 200, undefined),
  });

  const rows = abonnements?.data ?? [];

  const totalMoisCourant = rows
    .filter((a) => {
      if (!a.is_active || !a.montant) return false;
      const debut = new Date(a.date_debut);
      const now = new Date();
      return (
        debut.getFullYear() <= now.getFullYear() &&
        debut.getMonth() <= now.getMonth()
      );
    })
    .reduce((sum, a) => sum + (a.montant ?? 0), 0);

  const evolutionData = (() => {
    const grouped: Record<string, number> = {};
    rows.forEach((a) => {
      if (!a.montant) return;
      const mois = format(new Date(a.date_debut), "MMM yy", { locale: fr });
      grouped[mois] = (grouped[mois] ?? 0) + a.montant;
    });
    return Object.entries(grouped)
      .slice(-12)
      .map(([mois, total]) => ({ mois, total }));
  })();

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Revenus abonnements"
        description="Suivi des revenus plateforme par partenaire et par mois"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Total abonnements actifs
            </p>
            <p className="text-3xl font-bold mt-1">
              {rows.filter((a) => a.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Revenu mois courant (MGA)
            </p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {totalMoisCourant.toLocaleString("fr-FR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Abonnements inactifs
            </p>
            <p className="text-3xl font-bold mt-1 text-red-500">
              {rows.filter((a) => !a.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Évolution revenus (12 mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evolutionData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune donnée
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [
                    `${Number(v).toLocaleString("fr-FR")} MGA`,
                    "Revenus",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Revenus (MGA)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Aucun abonnement"
              description="Les abonnements apparaîtront ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant (MGA)</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.entreprises?.nom ?? "—"}
                      </TableCell>
                      <TableCell>{a.partenaires?.nom ?? "—"}</TableCell>
                      <TableCell className="capitalize">{a.plan}</TableCell>
                      <TableCell>
                        {a.montant ? a.montant.toLocaleString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.date_debut), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.date_fin
                          ? format(new Date(a.date_fin), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            a.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {a.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
