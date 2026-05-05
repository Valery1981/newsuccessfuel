"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Handshake,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const STATUS_COLORS: Record<string, string> = {
  validee: "#22c55e",
  en_attente: "#f97316",
  suspendue: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  validee: "Validées",
  en_attente: "En attente",
  suspendue: "Suspendues",
};

export function AdminDashboardPage() {
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminService.getStats(),
  });

  const { data: stationsEnAttente, isLoading: stationsLoading } = useQuery({
    queryKey: ["admin-stations-en-attente"],
    queryFn: () => adminService.getStationsEnAttente(),
  });

  const { data: abonnementsData } = useQuery({
    queryKey: ["admin-abonnements-evolution"],
    queryFn: () => adminService.getAbonnementsParMois(),
  });

  if (statsLoading) return <PageLoading />;

  const pieData = stats
    ? [
        {
          name: STATUS_LABELS.validee,
          value: stats.stations.validees,
          color: STATUS_COLORS.validee,
        },
        {
          name: STATUS_LABELS.en_attente,
          value: stats.stations.en_attente,
          color: STATUS_COLORS.en_attente,
        },
        {
          name: STATUS_LABELS.suspendue,
          value: stats.stations.suspendues,
          color: STATUS_COLORS.suspendue,
        },
      ].filter((d) => d.value > 0)
    : [];

  const evolutionData = (() => {
    if (!abonnementsData) return [];
    const grouped: Record<string, number> = {};
    abonnementsData.forEach((ab) => {
      if (!ab.created_at) return;
      const mois = format(new Date(ab.created_at), "MMM yyyy", { locale: fr });
      grouped[mois] = (grouped[mois] ?? 0) + 1;
    });
    return Object.entries(grouped)
      .slice(-6)
      .map(([mois, total]) => ({ mois, total }));
  })();

  return (
    <PageContainer>
      <PageHeader
        title="Tableau de bord Admin"
        description="Vue d'ensemble du système SuccessFuel"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/stations")}
            >
              Valider stations
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/users")}
            >
              Gérer utilisateurs
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total stations</p>
                <p className="text-2xl font-bold">
                  {stats?.stations.total ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validées</p>
                <p className="text-2xl font-bold">
                  {stats?.stations.validees ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">
                  {stats?.stations.en_attente ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Suspendues</p>
                <p className="text-2xl font-bold">
                  {stats?.stations.suspendues ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Entreprises actives
                </p>
                <p className="text-2xl font-bold">
                  {stats?.entreprisesActives ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gérants actifs</p>
                <p className="text-2xl font-bold">
                  {stats?.gerantsActifs ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                <Handshake className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Partenaires actifs
                </p>
                <p className="text-2xl font-bold">
                  {stats?.partenairesActifs ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Abonnements actifs
                </p>
                <p className="text-2xl font-bold">
                  {stats?.abonnementsActifs ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stations par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune station
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Évolution abonnements (6 mois)
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
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Abonnements"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stations en attente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Stations en attente de validation
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/stations")}
          >
            Voir tout
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {stationsLoading ? (
            <PageLoading />
          ) : !stationsEnAttente || stationsEnAttente.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune station en attente
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationsEnAttente.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nom}</TableCell>
                      <TableCell>
                        {s.entreprises?.nom ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.partenaires?.nom ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          En attente
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
