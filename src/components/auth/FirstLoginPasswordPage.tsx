"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { getDashboardPath, getPostLoginPath } from "@/lib/authPaths";
import {
  firstLoginPasswordSchema,
  type FirstLoginPasswordFormValues,
} from "@/lib/firstLoginPassword";

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30 pr-10";

export function FirstLoginPasswordPage() {
  const router = useRouter();
  const compte = useAuthStore((s) => s.compte);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const needsFirstPassword = compte?.must_change_password === true;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FirstLoginPasswordFormValues>({
    resolver: zodResolver(firstLoginPasswordSchema),
  });

  useEffect(() => {
    if (!isInitialized) return;
    if (!compte) {
      router.replace("/public/login");
      return;
    }
    if (!needsFirstPassword) {
      router.replace(getPostLoginPath(compte));
    }
  }, [isInitialized, compte, needsFirstPassword, router]);

  const onSubmit = async (data: FirstLoginPasswordFormValues) => {
    const current = useAuthStore.getState().compte;
    if (!current?.id) {
      toast.error("Session invalide, reconnectez-vous.");
      return;
    }

    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Session expirée, reconnectez-vous.");
      return;
    }

    const { error: uErr } = await supabase.auth.updateUser({
      password: data.password,
      data: {
        ...session.user.user_metadata,
        must_change_password: false,
      },
    });
    if (uErr) {
      toast.error(uErr.message || "Impossible de mettre à jour le mot de passe");
      return;
    }

    // Session à jour pour les requêtes suivantes (évite JWT obsolète après changement MDP).
    const { error: refErr } = await supabase.auth.refreshSession();
    if (refErr) {
      console.warn("[first-login] refreshSession:", refErr.message);
    }

    const completeRes = await fetch("/api/auth/complete-first-login", {
      method: "POST",
      credentials: "same-origin",
    });
    const completeJson: unknown = await completeRes.json().catch(() => null);
    if (!completeRes.ok) {
      const msg =
        typeof completeJson === "object" &&
        completeJson !== null &&
        "error" in completeJson &&
        typeof (completeJson as { error: unknown }).error === "string"
          ? (completeJson as { error: string }).error
          : "Impossible de valider le compte côté serveur";
      toast.error(msg);
      return;
    }

    useAuthStore.getState().setCompte({
      ...current,
      must_change_password: false,
    });
    toast.success("Mot de passe enregistré — bienvenue !");

    // Navigation pleine page : évite un état bloqué (RHF / transitions App Router) après updateUser.
    window.location.assign(getDashboardPath(current.type));
  };

  if (!isInitialized || !compte) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="pt-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  if (!needsFirstPassword && !isSubmitting) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="pt-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl">
          Définir votre mot de passe
        </CardTitle>
        <CardDescription className="text-slate-300">
          Vous utilisez un accès provisoire. Choisissez un mot de passe personnel
          pour sécuriser votre compte partenaire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Nouveau mot de passe
            </Label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                className={inputClassName}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-slate-200">
              Confirmer le mot de passe
            </Label>
            <div className="relative">
              <input
                id="confirm"
                type={showPw2 ? "text" : "password"}
                autoComplete="new-password"
                className={inputClassName}
                {...register("confirm")}
              />
              <button
                type="button"
                onClick={() => setShowPw2(!showPw2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPw2 ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirm && (
              <p className="text-red-400 text-sm">{errors.confirm.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Valider et accéder à mon espace"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
