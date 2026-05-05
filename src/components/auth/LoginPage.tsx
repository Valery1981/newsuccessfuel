"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { getPostLoginPath } from "@/lib/authPaths";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

const loginSchema = z.object({
  email: z.string().email("Email invalide").min(1, "Email obligatoire"),
  password: z.string().min(1, "Mot de passe obligatoire"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Redirige après login : première connexion (mot de passe provisoire), dashboard, ou no-account */
function redirectAfterAuth(router: ReturnType<typeof useRouter>) {
  return new Promise<void>((resolve) => {
    // Cas 1 : store déjà initialisé ET compte chargé — redirect immédiate
    // NB: on vérifie aussi que compte est non-null car reset() met isInitialized=true avec compte=null
    const { isInitialized, compte } = useAuthStore.getState();
    if (isInitialized && compte) {
      router.replace(getPostLoginPath(compte));
      resolve();
      return;
    }

    // Cas 2 : store pas encore initialisé ou compte pas encore chargé → attendre via subscribe
    // (onAuthStateChange va charger le compte puis setter isInitialized = true)
    const timeout = setTimeout(() => {
      unsubscribe();
      // Dernier essai avant timeout
      const finalCompte = useAuthStore.getState().compte;
      router.replace(getPostLoginPath(finalCompte));
      resolve();
    }, 8000);

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.isInitialized || !state.compte) return;
      clearTimeout(timeout);
      unsubscribe();
      router.replace(getPostLoginPath(state.compte));
      resolve();
    });
  });
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const { compte, isInitialized } = useAuthStore();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Redirection si l'utilisateur arrive sur la page login déjà authentifié
  useEffect(() => {
    if (isInitialized && compte) {
      router.replace(getPostLoginPath(compte));
    }
  }, [isInitialized, compte, router]);

  // Manually update input type for password visibility
  useEffect(() => {
    if (passwordInputRef.current) {
      passwordInputRef.current.type = showPassword ? "text" : "password";
    }
  }, [showPassword]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await authService.login(data.email, data.password);
      // Auth Supabase OK → attendre que AuthProvider charge le compte, puis rediriger
      setIsRedirecting(true);
      await redirectAfterAuth(router);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erreur de connexion";
      toast.error(
        msg.includes("Invalid") ? "Email ou mot de passe incorrect" : msg,
      );
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-white text-2xl">Connexion</CardTitle>
        <CardDescription className="text-slate-300">
          Accédez à votre espace SuccessFuel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              autoComplete="email"
              data-testid="email-input"
              className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-400 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Mot de passe
            </Label>
            <div className="relative">
              <Input
                ref={(e) => {
                  register("password").ref(e);
                  passwordInputRef.current = e;
                }}
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                data-testid="password-input"
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-amber-500 pr-10"
                onChange={register("password").onChange}
                onBlur={register("password").onBlur}
                name="password"
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

          <div className="flex justify-end">
            <Link
              href="/public/reset-password"
              className="text-amber-400 text-sm hover:text-amber-300 transition-colors"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            data-testid="login-button"
            disabled={isSubmitting || isRedirecting}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Chargement de votre espace...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Pas encore de compte ?{" "}
            <Link
              href="/public/signup"
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Créer un compte gérant
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
