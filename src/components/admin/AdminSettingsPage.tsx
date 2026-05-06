"use client";

import {
  AlertTriangle,
  Check,
  CreditCard,
  Pencil,
  Settings,
  Sliders,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (v: string) => void;
}

function EditableField({ label, value, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
    toast.success(`${label} mis à jour`);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {editing ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="mt-1 h-8 text-sm"
            autoFocus
          />
        ) : (
          <p className="font-medium text-sm">{value}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600"
              onClick={handleSave}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

const TYPES_INCIDENTS = [
  { value: "panne_pistolet", label: "Panne pistolet" },
  { value: "eau_dans_cuve", label: "Eau dans cuve" },
  { value: "panne_electrique", label: "Panne électrique" },
  { value: "probleme_livraison", label: "Problème livraison" },
  { value: "autre", label: "Autre" },
];

const PLANS = [
  {
    id: "standard",
    label: "Standard",
    prix: "150 000 Ar/mois",
    description:
      "Accès complet à la gestion de station (caisse, stock, comptabilité)",
  },
  {
    id: "premium",
    label: "Premium",
    prix: "250 000 Ar/mois",
    description:
      "Standard + rapports avancés, multi-station, support prioritaire",
  },
];

export function AdminSettingsPage() {
  const [platformInfo, setPlatformInfo] = useState({
    nom: "SuccessFuel",
    email_support: "support@successfuel.mg",
    telephone_support: "+261 34 00 000 00",
    version: "1.0.0",
    pays_defaut: "Madagascar",
  });

  const [variables, setVariables] = useState({
    delai_validation_station_jours: "3",
    delai_prise_en_charge_doleance_heures: "24",
    delai_resolution_doleance_heures: "72",
    seuil_alerte_stock_pct: "20",
  });

  const updatePlatform = (key: keyof typeof platformInfo) => (v: string) => {
    setPlatformInfo((prev) => ({ ...prev, [key]: v }));
  };

  const updateVariable = (key: keyof typeof variables) => (v: string) => {
    setVariables((prev) => ({ ...prev, [key]: v }));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Paramètres système"
        description="Configuration globale de la plateforme SuccessFuel"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1 : Informations plateforme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">
                Informations SuccessFuel
              </CardTitle>
            </div>
            <CardDescription>
              Informations générales de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <EditableField
              label="Nom de la plateforme"
              value={platformInfo.nom}
              onSave={updatePlatform("nom")}
            />
            <EditableField
              label="Email support"
              value={platformInfo.email_support}
              onSave={updatePlatform("email_support")}
            />
            <EditableField
              label="Téléphone support"
              value={platformInfo.telephone_support}
              onSave={updatePlatform("telephone_support")}
            />
            <EditableField
              label="Pays par défaut"
              value={platformInfo.pays_defaut}
              onSave={updatePlatform("pays_defaut")}
            />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="font-medium text-sm">{platformInfo.version}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Production
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 : Variables globales */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Variables globales</CardTitle>
            </div>
            <CardDescription>
              Seuils et délais configurables du système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 divide-y">
            <EditableField
              label="Délai validation station (jours)"
              value={variables.delai_validation_station_jours}
              onSave={updateVariable("delai_validation_station_jours")}
            />
            <EditableField
              label="Délai prise en charge doléance (heures)"
              value={variables.delai_prise_en_charge_doleance_heures}
              onSave={updateVariable("delai_prise_en_charge_doleance_heures")}
            />
            <EditableField
              label="Délai résolution doléance (heures)"
              value={variables.delai_resolution_doleance_heures}
              onSave={updateVariable("delai_resolution_doleance_heures")}
            />
            <EditableField
              label="Seuil alerte stock (%)"
              value={variables.seuil_alerte_stock_pct}
              onSave={updateVariable("seuil_alerte_stock_pct")}
            />
          </CardContent>
        </Card>

        {/* Section 2 : Plans d'abonnement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">
                Plans d&apos;abonnement
              </CardTitle>
            </div>
            <CardDescription>
              Plans disponibles pour les entreprises
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{plan.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          plan.id === "premium"
                            ? "border-yellow-400 text-yellow-600"
                            : "border-blue-300 text-blue-600"
                        }
                      >
                        {plan.prix}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                </div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Les plans sont configurés manuellement. Contactez l&apos;équipe
                technique pour modifier les tarifs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 : Types d'incidents */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">
                Types d&apos;incidents
              </CardTitle>
            </div>
            <CardDescription>
              Catégories d&apos;incidents configurées pour les doléances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TYPES_INCIDENTS.map((t) => (
                <div
                  key={t.value}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{t.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="mt-4 mb-2" />
            <p className="text-xs text-muted-foreground">
              Les types d&apos;incidents sont définis au niveau de la base de
              données. Contactez l&apos;équipe technique pour les modifier.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
