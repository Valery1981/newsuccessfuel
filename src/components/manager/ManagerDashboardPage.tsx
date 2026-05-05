"use client";

import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  BarChart2,
  Clock,
  Droplets,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabase = createClient();

const COLORS = [
  "#F5820A",
  "#5BB544",
  "#2B7CC1",
  "#F04444",
  "#F5A623",
  "#1B3D6F",
];

interface CaData {
  date: string;
  ca: number;
}
interface StockAlert {
  id: string;
  nom: string;
  stock_actuel: number;
  seuil_min: number;
  station_nom: string;
}
interface CreanceDette {
  tiers_nom: string;
  solde: number;
  echeance: string | null;
  type: "creance" | "dette";
}
interface TresoData {
  libelle: string;
  solde: number;
}
interface CapitauxPropres {
  capital_101: number;
  resultat_ytd: number;
  capitaux_propres_nets: number;
}
interface CaMensuel {
  ca_total: number;
  marge_brute: number;
}
interface EcartAlert {
  id: string;
  station_nom: string;
  date_inventaire: string;
  ecart_total: number;
}
interface ObjectifPerf {
  label: string;
  taux: number;
}

export function ManagerDashboardPage() {
  const { entreprise } = useAuthStore();

  // Stations de l'entreprise (pour filtrer les shifts via station_id)
  const { data: stationIds } = useQuery<string[]>({
    queryKey: ["station-ids", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("stations")
        .select("id")
        .eq("entreprise_id", entreprise.id);
      return (data ?? []).map((s) => s.id);
    },
    enabled: !!entreprise?.id,
    staleTime: 10 * 60 * 1000,
  });

  // CA journalier des 30 derniers jours (via station_id)
  const { data: caData, isLoading: caLoading } = useQuery<CaData[]>({
    queryKey: ["dashboard-ca", stationIds],
    queryFn: async () => {
      if (!stationIds?.length) return [];
      const depuis = subDays(new Date(), 30).toISOString().split("T")[0];
      const { data } = await supabase
        .from("shifts_carburant")
        .select("date_shift, ca_total")
        .in("station_id", stationIds)
        .gte("date_shift", depuis)
        .not("ca_total", "is", null);
      const grouped: Record<string, number> = {};
      for (const row of data ?? []) {
        const d = row.date_shift;
        grouped[d] = (grouped[d] ?? 0) + (row.ca_total ?? 0);
      }
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, ca]) => ({
          date: format(new Date(date), "dd/MM", { locale: fr }),
          ca,
        }));
    },
    enabled: !!stationIds?.length,
    staleTime: 5 * 60 * 1000,
  });

  // Situation trésorerie
  const { data: tresoData, isLoading: tresoLoading } = useQuery<TresoData[]>({
    queryKey: ["dashboard-tresorerie", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("tresoreries")
        .select("libelle, solde_actuel")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true);
      return (data ?? []).map((t) => ({
        libelle: t.libelle as string,
        solde: (t.solde_actuel as number) ?? 0,
      }));
    },
    enabled: !!entreprise?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Stocks en alerte — 2 queries (replaces N+1 pattern)
  const { data: stockAlerts } = useQuery<StockAlert[]>({
    queryKey: ["dashboard-stock-alerts", stationIds],
    queryFn: async () => {
      if (!stationIds?.length) return [];
      const [seuilsRes, stocksRes] = await Promise.all([
        supabase
          .from("seuils_alerte_stock")
          .select("article_id, station_id, seuil_minimum")
          .in("station_id", stationIds)
          .limit(50),
        supabase
          .from("mv_stocks_valorises")
          .select("article_id, article_nom, quantite, station_id, station_nom")
          .in("station_id", stationIds),
      ]);
      const seuils = (seuilsRes.data ?? []) as {
        article_id: string;
        station_id: string;
        seuil_minimum: number;
      }[];
      const stocks = (stocksRes.data ?? []) as {
        article_id: string;
        article_nom: string;
        quantite: number;
        station_id: string;
        station_nom: string;
      }[];
      const stockMap = new Map(
        stocks.map((s) => [`${s.station_id}::${s.article_id}`, s]),
      );
      const alerts = seuils
        .map((seuil) => {
          const st = stockMap.get(`${seuil.station_id}::${seuil.article_id}`);
          if (!st || st.quantite > seuil.seuil_minimum) return null;
          return {
            id: `${seuil.station_id}-${seuil.article_id}`,
            nom: st.article_nom,
            stock_actuel: st.quantite,
            seuil_min: seuil.seuil_minimum,
            station_nom: st.station_nom,
          };
        })
        .filter((x): x is StockAlert => x !== null);
      return alerts.sort((a, b) => a.stock_actuel - b.stock_actuel).slice(0, 5);
    },
    enabled: !!stationIds?.length,
    staleTime: 5 * 60 * 1000,
  });

  // CA mensuel + Marge brute (mv_ca_mensuel)
  const debutMois = startOfMonth(new Date()).toISOString().split("T")[0];
  const { data: caMensuel } = useQuery<CaMensuel>({
    queryKey: ["dashboard-ca-mensuel", entreprise?.id, debutMois],
    queryFn: async () => {
      if (!entreprise) return { ca_total: 0, marge_brute: 0 };
      const { data } = await supabase
        .from("mv_ca_mensuel")
        .select("ca_total, marge_brute")
        .eq("entreprise_id", entreprise.id)
        .eq("mois", debutMois)
        .single();
      return {
        ca_total:
          ((data as Record<string, unknown> | null)?.ca_total as number) ?? 0,
        marge_brute:
          ((data as Record<string, unknown> | null)?.marge_brute as number) ??
          0,
      };
    },
    enabled: !!entreprise?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Capitaux propres nets = 101 + 120 (mv_capitaux_propres)
  const { data: capitaux } = useQuery<CapitauxPropres>({
    queryKey: ["dashboard-capitaux", entreprise?.id],
    queryFn: async () => {
      if (!entreprise)
        return { capital_101: 0, resultat_ytd: 0, capitaux_propres_nets: 0 };
      const { data } = await supabase
        .from("mv_capitaux_propres")
        .select("capital_101, resultat_ytd, capitaux_propres_nets")
        .eq("entreprise_id", entreprise.id)
        .single();
      const r = data as Record<string, unknown> | null;
      return {
        capital_101: (r?.capital_101 as number) ?? 0,
        resultat_ytd: (r?.resultat_ytd as number) ?? 0,
        capitaux_propres_nets: (r?.capitaux_propres_nets as number) ?? 0,
      };
    },
    enabled: !!entreprise?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Shifts du mois (count)
  const { data: shiftsCount } = useQuery<number>({
    queryKey: ["dashboard-shifts-count", stationIds, debutMois],
    queryFn: async () => {
      if (!stationIds?.length) return 0;
      const { count } = await supabase
        .from("shifts_carburant")
        .select("id", { count: "exact", head: true })
        .in("station_id", stationIds)
        .gte("date_shift", debutMois);
      return count ?? 0;
    },
    enabled: !!stationIds?.length,
    staleTime: 5 * 60 * 1000,
  });

  // Écarts carburant non régularisés
  const { data: ecartsAlerts } = useQuery<EcartAlert[]>({
    queryKey: ["dashboard-ecarts-alerts", stationIds],
    queryFn: async () => {
      if (!stationIds?.length) return [];
      const { data } = await supabase
        .from("inventaires")
        .select(
          "id, date_inventaire, station_id, regularise_at, lignes_inventaire_carburant(ecart_litres), stations(nom)",
        )
        .in("station_id", stationIds)
        .is("regularise_at", null)
        .order("date_inventaire", { ascending: false })
        .limit(5);
      return (data ?? [])
        .map((inv) => {
          const r = inv as Record<string, unknown>;
          const lignes =
            (r.lignes_inventaire_carburant as
              | { ecart_litres: number }[]
              | null) ?? [];
          const ecart_total = lignes.reduce(
            (s, l) => s + (l.ecart_litres ?? 0),
            0,
          );
          return {
            id: r.id as string,
            station_nom: (r.stations as { nom: string } | null)?.nom ?? "—",
            date_inventaire: r.date_inventaire as string,
            ecart_total,
          };
        })
        .filter((e) => e.ecart_total !== 0);
    },
    enabled: !!stationIds?.length,
    staleTime: 5 * 60 * 1000,
  });

  // Objectifs vs Réalisations (volumes + CA boutique) — mois en cours
  const { data: objectifsPerf } = useQuery<ObjectifPerf[]>({
    queryKey: ["dashboard-objectifs", stationIds, debutMois],
    queryFn: async () => {
      if (!stationIds?.length) return [];
      const { data: objs } = await supabase
        .from("objectifs")
        .select("type, valeur, stations(nom)")
        .in("station_id", stationIds)
        .lte("periode_debut", debutMois)
        .gte("periode_fin", debutMois);
      if (!objs?.length) return [];
      const caMois = caMensuel?.ca_total ?? 0;
      return (objs as Record<string, unknown>[]).slice(0, 4).map((o) => {
        const type = o.type as string;
        const objectif = o.valeur as number;
        const stNom = (o.stations as { nom: string } | null)?.nom ?? "Réseau";
        return {
          label: `${stNom} – ${type === "ca_boutique" ? "CA boutique" : type}`,
          taux:
            objectif > 0
              ? Math.min(Math.round((caMois / objectif) * 100), 150)
              : 0,
        };
      });
    },
    enabled: !!stationIds?.length && caMensuel !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Créances/Dettes proches échéance
  const { data: creancesDettes } = useQuery<CreanceDette[]>({
    queryKey: ["dashboard-creances", entreprise?.id],
    queryFn: async () => {
      if (!entreprise) return [];
      const { data } = await supabase
        .from("vue_creances_en_cours")
        .select("tiers_nom, solde, echeance, type_creance")
        .eq("entreprise_id", entreprise.id)
        .eq("is_soldee", false)
        .order("echeance", { ascending: true, nullsFirst: false })
        .limit(8);
      return ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          tiers_nom: r.tiers_nom as string,
          solde: r.solde as number,
          echeance: r.echeance as string | null,
          type: (r.type_creance as string) === "dette" ? "dette" : "creance",
        };
      }) as CreanceDette[];
    },
    enabled: !!entreprise?.id,
    staleTime: 5 * 60 * 1000,
  });

  // KPIs
  const totalTresorerie = (tresoData ?? []).reduce(
    (acc, t) => acc + t.solde,
    0,
  );
  const alertesStock = (stockAlerts ?? []).length;
  const creancesEnAttente = (creancesDettes ?? [])
    .filter((c) => c.type === "creance")
    .reduce((acc, c) => acc + c.solde, 0);
  const caAujourdhui = (caData ?? []).at(-1)?.ca ?? 0;
  const caHier = (caData ?? []).at(-2)?.ca ?? 0;
  const caTendance = caHier > 0 ? ((caAujourdhui - caHier) / caHier) * 100 : 0;

  if (caLoading || tresoLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Tableau de bord"
        description="Vue synthétique de votre activité"
      />

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <KpiCard
          title="CA du mois"
          value={formatCurrency(caMensuel?.ca_total ?? 0)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
        />
        <KpiCard
          title="Marge brute"
          value={formatCurrency(caMensuel?.marge_brute ?? 0)}
          icon={<TrendingUp className="w-5 h-5" style={{ color: "#F5820A" }} />}
        />
        <KpiCard
          title="Trésorerie totale"
          value={formatCurrency(totalTresorerie)}
          icon={<Wallet className="w-5 h-5 text-blue-500" />}
        />
        <KpiCard
          title="Shifts du mois"
          value={(shiftsCount ?? 0).toString()}
          icon={<BarChart2 className="w-5 h-5 text-violet-500" />}
        />
      </div>
      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
        <KpiCard
          title="Capitaux propres nets"
          value={formatCurrency(capitaux?.capitaux_propres_nets ?? 0)}
          icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
        />
        <KpiCard
          title="CA aujourd'hui"
          value={formatCurrency(caAujourdhui)}
          trend={caTendance}
          icon={<TrendingUp className="w-5 h-5 text-teal-500" />}
        />
        <KpiCard
          title="Créances en attente"
          value={formatCurrency(creancesEnAttente)}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <KpiCard
          title="Alertes stock"
          value={alertesStock.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          danger={alertesStock > 0}
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* CA journalier (BarChart — spec §11) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              CA journalier — 30 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(caData ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée de vente disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={caData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  <Bar
                    dataKey="ca"
                    name="CA"
                    fill="#F5820A"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Trésorerie (camembert) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Situation trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            {(tresoData ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucun compte de trésorerie
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={tresoData ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="solde"
                      nameKey="libelle"
                    >
                      {(tresoData ?? []).map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {(tresoData ?? []).map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {t.libelle}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(t.solde)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Réalisations vs Objectifs */}
      {(objectifsPerf ?? []).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Réalisations vs Objectifs — mois en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(objectifsPerf ?? []).map((o, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">
                      {o.label}
                    </span>
                    <span
                      className={`text-xs font-semibold shrink-0 ${o.taux >= 100 ? "text-green-600" : o.taux >= 80 ? "text-amber-600" : "text-red-600"}`}
                    >
                      {o.taux}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(o.taux, 100)}%`,
                        backgroundColor:
                          o.taux >= 100
                            ? "#5BB544"
                            : o.taux >= 80
                              ? "#F5A623"
                              : "#F04444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Écarts carburant non régularisés */}
      {(ecartsAlerts ?? []).length > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4 text-orange-500" />
              Écarts carburant non régularisés
              <Badge variant="destructive" className="ml-auto text-xs">
                {(ecartsAlerts ?? []).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ecartsAlerts ?? []).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{e.station_nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.date_inventaire}
                    </p>
                  </div>
                  <Badge
                    variant={e.ecart_total < 0 ? "destructive" : "outline"}
                    className="font-mono text-xs"
                  >
                    {e.ecart_total > 0 ? "+" : ""}
                    {e.ecart_total.toFixed(2)} L
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Stocks en alerte */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Stocks en alerte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertesStock === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun article sous le seuil d&apos;alerte
              </p>
            ) : (
              <div className="space-y-2">
                {(stockAlerts ?? []).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{alert.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.station_nom}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {alert.stock_actuel} / seuil {alert.seuil_min}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Créances/Dettes proches échéance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Créances & Dettes — Échéances proches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(creancesDettes ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune créance ni dette en attente
              </p>
            ) : (
              <div className="space-y-2">
                {(creancesDettes ?? []).slice(0, 6).map((item, idx) => {
                  const urgence = getUrgence(item.echeance);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${urgence === "depasse" || urgence === "urgent" ? "bg-red-500" : urgence === "attention" ? "bg-orange-500" : "bg-green-500"}`}
                        />
                        <div>
                          <p className="font-medium">{item.tiers_nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.type === "creance" ? "Créance" : "Dette"} —
                            échéance{" "}
                            {item.echeance
                              ? format(new Date(item.echeance), "dd/MM/yyyy")
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-medium ${item.type === "creance" ? "text-blue-600" : "text-red-600"}`}
                      >
                        {formatCurrency(item.solde)}
                      </span>
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

function KpiCard({
  title,
  value,
  trend,
  icon,
  danger,
}: {
  title: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={danger ? "border-red-200 bg-red-50/50" : undefined}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${danger ? "text-red-600" : ""}`}
            >
              {value}
            </p>
            {trend !== undefined && (
              <div
                className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend).toFixed(1)}% vs hier
              </div>
            )}
          </div>
          <div className="p-2 bg-background rounded-lg border">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function getUrgence(
  echeance: string | null,
): "depasse" | "urgent" | "attention" | "normal" {
  if (!echeance) return "normal";
  const today = new Date();
  const date = new Date(echeance);
  const diff = Math.ceil(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return "depasse";
  if (diff <= 3) return "urgent";
  if (diff <= 7) return "attention";
  return "normal";
}
