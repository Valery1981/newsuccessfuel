"use client";

// SECURITY: Partner NEVER sees CA carburant, marges, CMUP or financial fuel data.
// ALLOWED: volume_vendu (litres), ca_boutique, objectifs, doleances, ecart_litres.

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Fuel,
  MapPin,
  ShoppingBag,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabase = createClient();

const SF_COLORS = [
  "#F5820A",
  "#5BB544",
  "#2B7CC1",
  "#F04444",
  "#F5A623",
  "#1B3D6F",
];

interface StationVolume {
  station_id: string;
  station_nom: string;
  volume_litres: number;
  ca_boutique: number;
}

interface EcartData {
  date: string;
  ecart: number;
}

interface Doleance {
  id: string;
  station_nom: string;
  type_incident: string;
  statut: string;
  delai_jours: number;
}

interface ObjectifRow {
  label: string;
  taux: number;
  type: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  danger?: boolean;
}

function KpiCard({ title, value, icon, sub, danger }: KpiCardProps) {
  return (
    <Card className={danger ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              {title}
            </p>
            <p
              className={`text-xl font-bold ${danger ? "text-red-700" : "text-foreground"}`}
            >
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div className="rounded-lg p-2 bg-muted/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PartnerDashboardPage() {
  const { compte } = useAuthStore();
  const depuis30j = subDays(new Date(), 30).toISOString().split("T")[0];
  const debutMois = startOfMonth(new Date()).toISOString().split("T")[0];

  // Step 1: resolve partenaire_id from compte
  const { data: partenaire, isLoading: partLoading } = useQuery<{
    id: string;
  } | null>({
    queryKey: ["partenaire-id-dash", compte?.id],
    queryFn: async () => {
      if (!compte) return null;
      const { data } = await supabase
        .from("partenaires")
        .select("id")
        .eq("compte_id", compte.id)
        .maybeSingle();
      return data as { id: string } | null;
    },
    enabled: !!compte?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Step 2: stations for this partenaire
  const { data: stations = [], isLoading: stationsLoading } = useQuery<
    { id: string; nom: string }[]
  >({
    queryKey: ["partner-stations-dash", partenaire?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stations")
        .select("id, nom")
        .eq("partenaire_id", partenaire!.id)
        .eq("status", "validee");
      return (data ?? []) as { id: string; nom: string }[];
    },
    enabled: !!partenaire?.id,
    staleTime: 10 * 60 * 1000,
  });

  const stationIds = stations.map((s) => s.id);

  // Volumes par station (litres ONLY — no CA carburant) + CA boutique
  const { data: volumesParStation = [], isLoading: volLoading } = useQuery<
    StationVolume[]
  >({
    queryKey: ["partner-volumes-stations", stationIds, depuis30j],
    queryFn: async () => {
      if (!stationIds.length) return [];
      const [volRes, caRes] = await Promise.all([
        supabase
          .from("lignes_shift_carburant")
          .select(
            "volume_vendu, shifts_carburant!inner(station_id, date_shift)",
          )
          .in("shifts_carburant.station_id", stationIds)
          .gte("shifts_carburant.date_shift", depuis30j),
        supabase
          .from("tickets_boutique")
          .select("station_id, total")
          .in("station_id", stationIds)
          .gte("date_vente", depuis30j),
      ]);
      const volMap = new Map<string, number>();
      for (const row of volRes.data ?? []) {
        const r = row as Record<string, unknown>;
        const shift = r.shifts_carburant as Record<string, unknown>;
        const sid = shift.station_id as string;
        volMap.set(
          sid,
          (volMap.get(sid) ?? 0) + ((r.volume_vendu as number) ?? 0),
        );
      }
      const caMap = new Map<string, number>();
      for (const row of caRes.data ?? []) {
        const r = row as Record<string, unknown>;
        const sid = r.station_id as string;
        caMap.set(sid, (caMap.get(sid) ?? 0) + ((r.total as number) ?? 0));
      }
      return stations
        .map((s) => ({
          station_id: s.id,
          station_nom: s.nom,
          volume_litres: volMap.get(s.id) ?? 0,
          ca_boutique: caMap.get(s.id) ?? 0,
        }))
        .sort((a, b) => b.volume_litres - a.volume_litres);
    },
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Écarts carburant réseau — from inventaires (litres, not ecart_caisse)
  const { data: ecartsData = [] } = useQuery<EcartData[]>({
    queryKey: ["partner-ecarts-inv", stationIds, depuis30j],
    queryFn: async () => {
      if (!stationIds.length) return [];
      const { data } = await supabase
        .from("lignes_inventaire_carburant")
        .select("ecart_litres, inventaires!inner(station_id, date_inventaire)")
        .in("inventaires.station_id", stationIds)
        .gte("inventaires.date_inventaire", depuis30j);
      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const r = row as Record<string, unknown>;
        const inv = r.inventaires as Record<string, unknown>;
        const d = inv.date_inventaire as string;
        grouped[d] = (grouped[d] ?? 0) + ((r.ecart_litres as number) ?? 0);
      }
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, ecart]) => ({
          date: format(new Date(date), "dd/MM", { locale: fr }),
          ecart,
        }));
    },
    enabled: stationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Doléances en cours
  const { data: doleances = [] } = useQuery<Doleance[]>({
    queryKey: ["partner-doleances-dash", stationIds],
    queryFn: async () => {
      if (!stationIds.length) return [];
      const { data } = await supabase
        .from("doleances")
        .select(
          "id, station_id, type_incident, statut, created_at, stations(nom)",
        )
        .in("station_id", stationIds)
        .neq("statut", "reglee")
        .order("created_at", { ascending: true })
        .limit(8);
      const today = new Date();
      return (data ?? []).map((d) => {
        const r = d as Record<string, unknown>;
        const jours = Math.floor(
          (today.getTime() - new Date(r.created_at as string).getTime()) /
            86400000,
        );
        return {
          id: r.id as string,
          station_nom: (r.stations as { nom: string } | null)?.nom ?? "—",
          type_incident: (r.type_incident as string) ?? "—",
          statut: (r.statut as string) ?? "—",
          delai_jours: jours,
        };
      });
    },
    enabled: stationIds.length > 0,
    staleTime: 3 * 60 * 1000,
  });

  // Réalisations vs Objectifs (volumes + CA boutique)
  const { data: objectifs = [] } = useQuery<ObjectifRow[]>({
    queryKey: ["partner-objectifs-dash", stationIds, debutMois],
    queryFn: async () => {
      if (!stationIds.length) return [];
      const { data: objs } = await supabase
        .from("objectifs")
        .select("station_id, type, valeur, type_carburant, stations(nom)")
        .in("station_id", stationIds)
        .lte("periode_debut", debutMois)
        .gte("periode_fin", debutMois);
      if (!objs?.length) return [];
      const totalVol = volumesParStation.reduce(
        (s, v) => s + v.volume_litres,
        0,
      );
      const totalCaB = volumesParStation.reduce((s, v) => s + v.ca_boutique, 0);
      return (objs as Record<string, unknown>[]).slice(0, 4).map((o) => {
        const type = o.type as string;
        const realise = type === "ca_boutique" ? totalCaB : totalVol;
        const objectif = o.valeur as number;
        const stNom = (o.stations as { nom: string } | null)?.nom ?? "Réseau";
        const label = `${stNom} – ${type === "ca_boutique" ? "CA boutique" : ((o.type_carburant as string) ?? type)}`;
        return {
          label,
          taux:
            objectif > 0
              ? Math.min(Math.round((realise / objectif) * 100), 150)
              : 0,
          type,
        };
      });
    },
    enabled: stationIds.length > 0 && volumesParStation.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const totalVolume = volumesParStation.reduce(
    (a, s) => a + s.volume_litres,
    0,
  );
  const totalCaBoutique = volumesParStation.reduce(
    (a, s) => a + s.ca_boutique,
    0,
  );
  const ecartTotal = ecartsData.reduce((a, e) => a + e.ecart, 0);
  const nbDoleancesOuvertes = doleances.length;

  if (partLoading || stationsLoading || volLoading) return <PageLoading />;

  const statutBadge: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    envoyee: { label: "Envoyée", variant: "destructive" },
    prise_en_charge: { label: "Prise en charge", variant: "default" },
    en_cours: { label: "En cours", variant: "secondary" },
  };

  return (
    <PageContainer>
      <PageHeader
        title="Tableau de bord Partenaire"
        description={`Vue synthétique du réseau — ${stations.length} station(s) active(s)`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <KpiCard
          title="Volume réseau (30j)"
          value={`${totalVolume.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L`}
          icon={<Fuel className="w-5 h-5 text-blue-500" />}
          sub="Litres carburant vendus"
        />
        <KpiCard
          title="CA Boutique (30j)"
          value={formatCurrency(totalCaBoutique)}
          icon={
            <ShoppingBag className="w-5 h-5" style={{ color: "#F5820A" }} />
          }
        />
        <KpiCard
          title="Stations actives"
          value={stations.length.toString()}
          icon={<MapPin className="w-5 h-5 text-amber-500" />}
        />
        <KpiCard
          title="Doléances ouvertes"
          value={nbDoleancesOuvertes.toString()}
          icon={<AlertCircle className="w-5 h-5 text-red-500" />}
          danger={nbDoleancesOuvertes > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Volume par station (litres only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Volume par station — 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volumesParStation.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune vente enregistrée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={volumesParStation.map((s) => ({
                    name: s.station_nom.substring(0, 12),
                    vol: Math.round(s.volume_litres),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: unknown) =>
                      `${(v as number).toLocaleString("fr-FR")} L`
                    }
                  />
                  <Bar dataKey="vol" name="Volume (L)" radius={[3, 3, 0, 0]}>
                    {volumesParStation.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={SF_COLORS[idx % SF_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Écarts inventaire carburant réseau (litres) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Écarts inventaire carburant (L)
              {ecartTotal !== 0 && (
                <span
                  className={`text-xs font-normal ml-auto ${ecartTotal < 0 ? "text-red-500" : "text-green-500"}`}
                >
                  {ecartTotal > 0 ? "+" : ""}
                  {ecartTotal.toLocaleString("fr-FR")} L
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ecartsData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucun inventaire enregistré
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ecartsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: unknown) =>
                      `${(v as number).toLocaleString("fr-FR")} L`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="ecart"
                    name="Écart (L)"
                    stroke="#F04444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Réalisations vs Objectifs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Réalisations vs Objectifs — mois en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {objectifs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun objectif configuré ce mois-ci
              </p>
            ) : (
              <div className="space-y-3">
                {objectifs.map((o, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate max-w-[200px]">
                        {o.label}
                      </span>
                      <span
                        className={`text-xs font-semibold shrink-0 ${o.taux >= 100 ? "text-green-600" : o.taux >= 80 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {o.taux}%
                      </span>
                    </div>
                    <Progress value={Math.min(o.taux, 100)} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance par station — volumes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance réseau — Volumes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volumesParStation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune donnée disponible
              </p>
            ) : (
              <div className="space-y-3">
                {volumesParStation.map((s, idx) => {
                  const pct =
                    totalVolume > 0
                      ? Math.round((s.volume_litres / totalVolume) * 100)
                      : 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {s.station_nom}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {pct}%
                          </span>
                          <span className="text-sm font-semibold text-blue-700">
                            {s.volume_litres.toLocaleString("fr-FR", {
                              maximumFractionDigits: 0,
                            })}{" "}
                            L
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: SF_COLORS[idx % SF_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doléances en cours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Doléances en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {doleances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <p className="text-sm text-muted-foreground">
                  Aucune doléance en cours
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {doleances.map((d) => {
                  const badge = statutBadge[d.statut] ?? {
                    label: d.statut,
                    variant: "outline" as const,
                  };
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md border"
                    >
                      <div>
                        <p className="text-sm font-medium">{d.station_nom}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {d.type_incident.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {d.delai_jours}j
                        </span>
                        <Badge variant={badge.variant} className="text-xs">
                          {badge.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
