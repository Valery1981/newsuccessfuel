"use client";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";
import type { Database } from "@/types/supabase";
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type EntrepriseUpdate = Database["public"]["Tables"]["entreprises"]["Update"];

const entrepriseSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  pays: z.string().min(2, "Le pays est requis"),
  adresse: z.string().optional(),
  nif: z.string().optional(),
  stat: z.string().optional(),
  rcs: z.string().optional(),
  telephone: z.string().optional(),
  whatsapp: z.string().optional(),
});

type EntrepriseFormData = z.infer<typeof entrepriseSchema>;

export function ManagerCompanyPage() {
  const { entreprise, setEntreprise } = useAuthStore();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const form = useForm<EntrepriseFormData>({
    resolver: zodResolver(entrepriseSchema),
    defaultValues: {
      nom: entreprise?.nom ?? "",
      pays: entreprise?.pays ?? "",
      adresse: entreprise?.adresse ?? "",
      nif: entreprise?.nif ?? "",
      stat: entreprise?.stat ?? "",
      rcs: entreprise?.rcs ?? "",
      telephone: entreprise?.telephone ?? "",
      whatsapp: entreprise?.whatsapp ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EntrepriseFormData) => {
      if (!entreprise?.id) throw new Error("Entreprise introuvable");
      const updateData: EntrepriseUpdate = {
        nom: data.nom,
        pays: data.pays,
        adresse: data.adresse ?? null,
        nif: data.nif ?? null,
        stat: data.stat ?? null,
        rcs: data.rcs ?? null,
        telephone: data.telephone ?? null,
        whatsapp: data.whatsapp ?? null,
      };
      const { data: result, error } = await supabase
        .from("entreprises")
        .update(updateData)
        .eq("id", entreprise.id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      setEntreprise(result as Parameters<typeof setEntreprise>[0]);
      queryClient.invalidateQueries({ queryKey: ["entreprise"] });
      toast.success("Informations mises à jour avec succès");
    },
    onError: (error) => {
      toast.error(
        "Erreur lors de la mise à jour : " + (error as Error).message,
      );
    },
  });

  const onSubmit = (data: EntrepriseFormData) => {
    mutation.mutate(data);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Mon Entreprise"
        description="Gérez les informations de votre entreprise"
      />

      <div className="mt-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              Informations légales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l&apos;entreprise *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SuccessFuel SARL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pays *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Madagascar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adresse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input placeholder="Adresse complète" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="nif"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIF</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Numéro d'identification fiscale"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>STAT</FormLabel>
                        <FormControl>
                          <Input placeholder="Numéro STAT" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rcs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RCS</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Registre du commerce"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="telephone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+261 XX XXX XX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="+261 XX XXX XX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
