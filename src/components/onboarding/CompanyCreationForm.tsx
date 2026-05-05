"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { entrepriseService } from "@/services/entrepriseService";
import { useAuthStore } from "@/stores/authStore";

const companySchema = z.object({
  nom: z.string().min(2, "Nom minimum 2 caractères").max(255),
  pays: z.string().min(2, "Pays obligatoire").default("Madagascar"),
  adresse: z.string().optional(),
  nif: z.string().optional(),
  stat: z.string().optional(),
  rcs: z.string().optional(),
  telephone: z.string().optional(),
  whatsapp: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export function CompanyCreationForm() {
  const router = useRouter();
  const { compte, setEntreprise } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(
      companySchema,
    ) as import("react-hook-form").Resolver<CompanyFormData>,
    defaultValues: { pays: "Madagascar" },
  });

  const onSubmit = async (data: CompanyFormData) => {
    if (!compte) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    try {
      const entreprise = await entrepriseService.createEntreprise({
        ...data,
        compte_id: compte.id,
      });

      setEntreprise({
        id: entreprise.id,
        nom: entreprise.nom,
        pays: entreprise.pays,
        is_active: entreprise.is_active ?? true,
      });

      toast.success("Entreprise créée avec succès !");
      router.push("/station");
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
          Informations de votre entreprise
        </CardTitle>
        <CardDescription className="text-slate-300">
          Ces informations apparaîtront sur vos documents comptables
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-slate-200">
              Nom de l&apos;entreprise <span className="text-red-400">*</span>
            </Label>
            <Input
              id="nom"
              placeholder="Ex: Station-Service Fianarantsoa"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              {...register("nom")}
            />
            {errors.nom && (
              <p className="text-red-400 text-sm">{errors.nom.message}</p>
            )}
          </div>

          {/* Pays + Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pays" className="text-slate-200">
                Pays <span className="text-red-400">*</span>
              </Label>
              <Input
                id="pays"
                placeholder="Madagascar"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("pays")}
              />
              {errors.pays && (
                <p className="text-red-400 text-sm">{errors.pays.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse" className="text-slate-200">
                Adresse
              </Label>
              <Input
                id="adresse"
                placeholder="Adresse complète"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("adresse")}
              />
            </div>
          </div>

          {/* NIF + STAT + RCS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nif" className="text-slate-200">
                NIF
              </Label>
              <Input
                id="nif"
                placeholder="Numéro NIF"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("nif")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stat" className="text-slate-200">
                STAT
              </Label>
              <Input
                id="stat"
                placeholder="Numéro STAT"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("stat")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcs" className="text-slate-200">
                RCS
              </Label>
              <Input
                id="rcs"
                placeholder="Numéro RCS"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("rcs")}
              />
            </div>
          </div>

          {/* Téléphone + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-slate-200">
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+261 XX XXX XXX"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                {...register("whatsapp")}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
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
