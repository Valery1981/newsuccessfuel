"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stationService } from "@/services/stationService";
import { tmService } from "@/services/tmService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const stationSchema = z.object({
  nom: z.string().min(2, "Nom minimum 2 caractères").max(255),
  partenaire_id: z.string().optional(),
  tm_id: z.string().optional(),
  adresse: z.string().optional(),
  telephone: z.string().optional(),
});

type StationFormData = z.infer<typeof stationSchema>;

export function CreateStationsForm() {
  const router = useRouter();
  const { entreprise } = useAuthStore();

  const { data: partenaires } = useQuery({
    queryKey: ["partenaires-officiels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partenaires")
        .select("id, nom")
        .eq("type", "officiel")
        .eq("is_active", true)
        .order("nom");
      return data ?? [];
    },
  });

  const { data: tms } = useQuery({
    queryKey: ["tms"],
    queryFn: async () => {
      return tmService.getTMs();
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StationFormData>({
    resolver: zodResolver(stationSchema),
  });

  const partenaireId = useWatch({
    control,
    name: "partenaire_id",
  });

  const tmId = useWatch({
    control,
    name: "tm_id",
  });

  const onSubmit = async (data: StationFormData) => {
    if (!entreprise) {
      toast.error("Veuillez d'abord créer votre entreprise");
      router.push("/company");
      return;
    }

    try {
      const station = await stationService.createStation({
        ...data,
        entreprise_id: entreprise.id,
        partenaire_id: data.partenaire_id || undefined,
        tm_id: data.tm_id === "partner_choice" ? null : data.tm_id || undefined,
        status: "en_attente",
        onboarding_step: "cuves",
      });

      toast.success("Station créée avec succès !");
      router.push(`/cuves?station_id=${station.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création",
      );
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-xl">
          Créer votre station
        </CardTitle>
        <CardDescription className="text-slate-300">
          Informations principales de votre station-service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-slate-200">
              Nom de la station <span className="text-red-400">*</span>
            </Label>
            <Input
              id="nom"
              placeholder="Ex: Station Fianarantsoa"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              {...register("nom")}
            />
            {errors.nom && (
              <p className="text-red-400 text-sm">{errors.nom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Partenaire pétrolier</Label>
            <Select
              value={partenaireId || undefined}
              onValueChange={(val: string | null) =>
                setValue("partenaire_id", val ?? "")
              }
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sélectionner un partenaire (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun partenaire</SelectItem>
                {(partenaires ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tm_id" className="text-slate-200">
              {"Territory Manager"}
            </Label>
            <Select
              value={tmId || undefined}
              onValueChange={(val: string | null) =>
                setValue("tm_id", val ?? "")
              }
            >
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sélectionner un TM ou laisser le partenaire choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner_choice">
                  Laisser Partenaire choisir le TM
                </SelectItem>
                {(tms ?? []).map((tm) => (
                  <SelectItem key={tm.id} value={tm.id}>
                    {tm.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tm_id && (
              <p className="text-red-400 text-sm">{errors.tm_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse" className="text-slate-200">
              Adresse
            </Label>
            <Input
              id="adresse"
              placeholder="Adresse de la station"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              {...register("adresse")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-slate-200">
              Téléphone
            </Label>
            <Input
              id="telephone"
              type="tel"
              placeholder="+261 XX XXX XXX"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              {...register("telephone")}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/services")}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              ← Retour
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Continuer →"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
