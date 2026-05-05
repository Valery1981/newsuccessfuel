"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

export function NoAccountPage() {
  const router = useRouter();
  const { reset } = useAuthStore();

  const handleLogout = async () => {
    await authService.logout();
    reset();
    router.replace("/public/login");
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        </div>
        <CardTitle className="text-white text-xl">Compte introuvable</CardTitle>
        <CardDescription className="text-slate-300">
          Votre session est active mais aucun compte SuccessFuel n&apos;est associé à cet utilisateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-sm text-slate-300 space-y-2">
          <p>Causes possibles :</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Le schéma de base de données n&apos;a pas encore été appliqué</li>
            <li>Le compte n&apos;a pas été créé correctement (ex : script superadmin)</li>
            <li>Vous utilisez un email différent de celui enregistré</li>
          </ul>
        </div>
        <Button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Se déconnecter
        </Button>
      </CardContent>
    </Card>
  );
}
