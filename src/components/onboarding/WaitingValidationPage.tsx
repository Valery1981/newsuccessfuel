"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stationService } from "@/services/stationService";
import { useAuthStore } from "@/stores/authStore";

const STATUS_MAP = {
  en_attente: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  validee: {
    label: "Validée",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  suspendue: {
    label: "Suspendue",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

export function WaitingValidationPage() {
  const router = useRouter();
  const { entreprise } = useAuthStore();
  const isRouterReady = useRef(false);

  useEffect(() => {
    isRouterReady.current = true;
  }, []);

  const { data: stations, refetch } = useQuery({
    queryKey: ["stations-validation", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
    refetchInterval: 10000, // Check every 10s
  });

  // Auto-redirect if any station is validated
  useEffect(() => {
    if (!isRouterReady.current) return;
    if (stations?.some((s) => s.status === "validee")) {
      router.push("/manager/dashboard");
    }
  }, [stations, router]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <CardTitle className="text-white text-xl">
          Configuration terminée !
        </CardTitle>
        <p className="text-slate-300 text-sm mt-2">
          Votre station est en attente de validation par votre partenaire
          pétrolier ou l&apos;administrateur SuccessFuel.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(stations ?? []).map((station) => {
          const status =
            STATUS_MAP[station.status ?? "en_attente"] ?? STATUS_MAP.en_attente;
          const StatusIcon = status.icon;

          return (
            <div
              key={station.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <p className="text-white font-medium">{station.nom}</p>
                <p className="text-slate-400 text-sm">
                  {station.adresse ?? "—"}
                </p>
              </div>
              <Badge className={status.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          );
        })}

        <div className="space-y-2 pt-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            Actualiser le statut
          </Button>
          <Button
            onClick={() => router.push("/manager/dashboard")}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            Accéder au tableau de bord
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
