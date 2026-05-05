"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authService } from "@/services/authService";

const signupSchema = z
  .object({
    nom: z.string().min(2, "Nom minimum 2 caractères").max(100),
    email: z.string().email("Email invalide").min(1, "Email obligatoire"),
    telephone: z.string().optional(),
    password: z
      .string()
      .min(8, "Mot de passe minimum 8 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Doit contenir majuscule, minuscule et chiffre"
      ),
    confirmPassword: z.string().min(1, "Confirmation obligatoire"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await authService.signup({
        email: data.email,
        password: data.password,
        nom: data.nom,
        telephone: data.telephone,
      });
      toast.success("Compte créé avec succès ! Vérifiez votre email.");
      router.push("/company");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erreur lors de l'inscription";
      toast.error(
        msg.includes("already registered")
          ? "Cet email est déjà utilisé"
          : msg
      );
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl">
          Créer un compte gérant
        </CardTitle>
        <CardDescription className="text-slate-300">
          Commencez à gérer votre station-service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom" className="text-slate-200">
              Nom complet <span className="text-red-400">*</span>
            </Label>
            <Input
              id="nom"
              placeholder="Votre nom complet"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500"
              {...register("nom")}
            />
            {errors.nom && (
              <p className="text-red-400 text-sm">{errors.nom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-400 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone" className="text-slate-200">
              Téléphone
            </Label>
            <Input
              id="telephone"
              type="tel"
              placeholder="+261 XX XXX XXX"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500"
              {...register("telephone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Mot de passe <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500 pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
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
            <Label htmlFor="confirmPassword" className="text-slate-200">
              Confirmer le mot de passe <span className="text-red-400">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm">
                {errors.confirmPassword.message}
              </p>
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
                Création en cours...
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Déjà un compte ?{" "}
            <Link
              href="/public/login"
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
