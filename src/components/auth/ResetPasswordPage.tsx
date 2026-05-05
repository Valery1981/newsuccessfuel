"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";

const resetSchema = z.object({
  email: z.string().email("Email invalide").min(1, "Email obligatoire"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email de réinitialisation envoyé");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
          <CardDescription>
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Un email vient d&apos;être envoyé. Consultez votre boîte de
                réception et suivez le lien pour définir un nouveau mot de
                passe.
              </p>
              <Link
                href="/public/login"
                className={buttonVariants({ className: "w-full" })}
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  "Envoyer le lien"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link
                  href="/public/login"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
