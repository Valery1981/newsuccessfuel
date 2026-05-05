"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { cuveService } from "@/services/cuveService";
import { initialisationService } from "@/services/initialisationService";
import { pistoletService } from "@/services/pistoletService";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";

type InitialisationRow = Database["public"]["Tables"]["initialisation"]["Row"];
type StationRow = Database["public"]["Tables"]["stations"]["Row"];
type CuveRow = Database["public"]["Tables"]["cuves"]["Row"];
type PistoletRow = Database["public"]["Tables"]["pistolets"]["Row"];

export function CompanyInitialisationPage() {
  const { entreprise, compte } = useAuthStore();
  const queryClient = useQueryClient();
  const [confirmValidate, setConfirmValidate] = useState(false);
  const [selectedStation, setSelectedStation] = useState("");

  const { data: initialisation, isLoading } =
    useQuery<InitialisationRow | null>({
      queryKey: ["initialisation", entreprise?.id],
      queryFn: () =>
        entreprise
          ? initialisationService.getOrCreateInitialisation(entreprise.id)
          : null,
      enabled: !!entreprise?.id,
    });

  const { data: stations } = useQuery<StationRow[]>({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: cuves } = useQuery<CuveRow[]>({
    queryKey: ["cuves", selectedStation],
    queryFn: () => cuveService.getCuvesByStation(selectedStation),
    enabled: !!selectedStation,
  });

  const { data: pistolets } = useQuery<PistoletRow[]>({
    queryKey: ["pistolets", selectedStation],
    queryFn: () => pistoletService.getPistoletsByStation(selectedStation),
    enabled: !!selectedStation,
  });

  // State for cuve jauges
  const [cuveJauges, setCuveJauges] = useState<
    Record<
      string,
      { jauge_cm: string; volume_litres: string; prix_achat: string }
    >
  >({});
  const [pistoletIndexes, setPistoletIndexes] = useState<
    Record<string, string>
  >({});

  const validationMutation = useMutation({
    mutationFn: () => {
      if (!initialisation || !compte) throw new Error("Session invalide");
      return initialisationService.validerInitialisation(
        initialisation.id,
        compte.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initialisation"] });
      toast.success(
        "Initialisation validée ! Vous pouvez commencer à utiliser l'application.",
      );
      setConfirmValidate(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmValidate(false);
    },
  });

  const saveCuvesMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation) throw new Error("Session invalide");
      const entries = (cuves ?? [])
        .filter((c) => cuveJauges[c.id])
        .map((c) => ({
          cuve_id: c.id,
          station_id: selectedStation,
          jauge_initiale_cm: Number(cuveJauges[c.id].jauge_cm),
          volume_initial_litres: Number(cuveJauges[c.id].volume_litres),
          prix_achat_initial: Number(cuveJauges[c.id].prix_achat),
        }));
      await initialisationService.saveInitialisationCuves(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => toast.success("Cuves enregistrées"),
    onError: (error) => toast.error(error.message),
  });

  const savePistoletsMutation = useMutation({
    mutationFn: async () => {
      if (!initialisation) throw new Error("Session invalide");
      const entries = (pistolets ?? [])
        .filter((p) => pistoletIndexes[p.id])
        .map((p) => ({
          pistolet_id: p.id,
          station_id: selectedStation,
          index_initial: Number(pistoletIndexes[p.id]),
        }));
      await initialisationService.saveInitialisationIndexPistolets(
        initialisation.id,
        entries,
      );
    },
    onSuccess: () => toast.success("Index pistolets enregistrés"),
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <PageLoading />;

  if (initialisation?.est_validee) {
    return (
      <PageContainer>
        <PageHeader title="Initialisation" />
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Initialisation validée</AlertTitle>
          <AlertDescription>
            L'initialisation a été validée le{" "}
            {initialisation.validee_at
              ? new Date(initialisation.validee_at).toLocaleDateString("fr-FR")
              : ""}
            . Capital net calculé :{" "}
            <strong>
              {formatCurrency(initialisation.capital_net_calcule ?? 0)}
            </strong>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Initialisation"
        description="Saisissez les données de départ de votre entreprise (opération irréversible)"
        actions={
          <Button
            onClick={() => setConfirmValidate(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider l'initialisation
          </Button>
        }
      />

      <Alert className="border-amber-500 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Action irréversible</AlertTitle>
        <AlertDescription>
          La validation de l'initialisation est irréversible. Elle génère les A
          Nouveau comptables, les entrées de stock initiales et le Capital Net.
          Vérifiez bien toutes les données avant de valider.
        </AlertDescription>
      </Alert>

      {/* Station selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Label>Station :</Label>
            <Select
              value={selectedStation}
              onValueChange={(val) => setSelectedStation(val ?? "")}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Sélectionner une station">
                  {(stations ?? []).find((s) => s.id === selectedStation)?.nom}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(stations ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="cuves">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cuves">Cuves</TabsTrigger>
          <TabsTrigger value="pistolets">Index Pistolets</TabsTrigger>
          <TabsTrigger value="stock-boutique">Stock Boutique</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="immobilisations">Immobilisations</TabsTrigger>
        </TabsList>

        {/* Tab Cuves */}
        <TabsContent value="cuves">
          <Card>
            <CardHeader>
              <CardTitle>Jauges initiales des cuves</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStation ? (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une station pour voir ses cuves
                </p>
              ) : (
                <>
                  {(cuves ?? []).map((cuve) => (
                    <div
                      key={cuve.id}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg"
                    >
                      <div>
                        <Badge className="mb-2">
                          {cuve.nom} ({cuve.type_carburant})
                        </Badge>
                      </div>
                      <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Jauge (cm)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.jauge_cm ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  jauge_cm: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                            min={0}
                            max={300}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Volume (L)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.volume_litres ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  volume_litres: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prix achat (MGA/L)</Label>
                          <Input
                            type="number"
                            value={cuveJauges[cuve.id]?.prix_achat ?? ""}
                            onChange={(e) =>
                              setCuveJauges((prev) => ({
                                ...prev,
                                [cuve.id]: {
                                  ...prev[cuve.id],
                                  prix_achat: e.target.value,
                                },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => saveCuvesMutation.mutate()}
                    disabled={saveCuvesMutation.isPending}
                  >
                    {saveCuvesMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Enregistrer les cuves
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pistolets */}
        <TabsContent value="pistolets">
          <Card>
            <CardHeader>
              <CardTitle>Index de départ des pistolets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedStation ? (
                <p className="text-muted-foreground text-sm">
                  Sélectionnez une station pour voir ses pistolets
                </p>
              ) : (
                <>
                  {(pistolets ?? []).map((pistolet) => (
                    <div
                      key={pistolet.id}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{pistolet.numero}</p>
                        <p className="text-sm text-muted-foreground">
                          {pistolet.type_carburant}
                        </p>
                      </div>
                      <div className="w-40">
                        <Input
                          type="number"
                          value={pistoletIndexes[pistolet.id] ?? ""}
                          onChange={(e) =>
                            setPistoletIndexes((prev) => ({
                              ...prev,
                              [pistolet.id]: e.target.value,
                            }))
                          }
                          placeholder="Index initial"
                          min={0}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={() => savePistoletsMutation.mutate()}
                    disabled={savePistoletsMutation.isPending}
                  >
                    {savePistoletsMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Enregistrer les index
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs - simplified placeholders */}
        <TabsContent value="stock-boutique">
          <Card>
            <CardHeader>
              <CardTitle>Stock Boutique Initial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Fonctionnalité en développement — saisissez les quantités et
                prix d'achat initiaux de vos articles en boutique.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tresorerie">
          <Card>
            <CardHeader>
              <CardTitle>Soldes Trésorerie Initiaux</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Saisissez les soldes initiaux de vos comptes de trésorerie
                (banque, mobile money, caisse).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Soldes Tiers Initiaux</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Saisissez les soldes initiaux de vos fournisseurs et clients
                (créances et dettes existantes).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="immobilisations">
          <Card>
            <CardHeader>
              <CardTitle>Immobilisations Initiales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Enregistrez vos immobilisations corporelles et incorporelles
                initiales (véhicules, équipements, etc.).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmValidate}
        onOpenChange={setConfirmValidate}
        title="Valider l'initialisation ?"
        description="Cette opération est IRRÉVERSIBLE. Elle génère les A Nouveau comptables, les entrées de stock initiales et le Capital Net. Êtes-vous certain de vouloir continuer ?"
        confirmLabel="Oui, valider définitivement"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={() => validationMutation.mutate()}
      />
    </PageContainer>
  );
}
