"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buildTicketPrintHtml, openPrintWindow } from "@/lib/printUtils";
import { formatCurrency } from "@/lib/utils";
import { stationService } from "@/services/stationService";
import { tresorerieService } from "@/services/tresorerieService";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

interface ArticleResult {
  id: string;
  nom: string;
  famille: string;
  unite: string;
  is_service: boolean;
  prix_vente_articles?: Array<{ prix_vente: number; station_id: string }>;
}

interface CartItem {
  article: ArticleResult;
  quantite: number;
  prix_unitaire: number;
}

interface ShiftBoutique {
  id: string;
  numero_shift: string;
  statut: string;
  date_ouverture: string;
}

export function ManagerShopSalesPage() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedStationId, setSelectedStationId] = useState("");
  const [activeShift, setActiveShift] = useState<ShiftBoutique | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("especes");
  const [tresorerieId, setTresorerieId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);

  const { data: stations } = useQuery({
    queryKey: ["stations", entreprise?.id],
    queryFn: () =>
      entreprise ? stationService.getStationsByEntreprise(entreprise.id) : [],
    enabled: !!entreprise?.id,
  });

  const { data: tresoreries } = useQuery({
    queryKey: ["tresoreries", entreprise?.id],
    queryFn: () =>
      entreprise
        ? tresorerieService.getTresoreriesByEntreprise(entreprise.id)
        : [],
    enabled: !!entreprise?.id,
  });

  const { data: articles } = useQuery({
    queryKey: ["articles-pos", entreprise?.id, searchQuery],
    queryFn: async () => {
      if (!entreprise || !searchQuery || searchQuery.length < 2) return [];
      // Récupérer les articles
      const { data: articlesData } = await supabase
        .from("articles")
        .select("id, nom, famille, unite, is_active")
        .eq("entreprise_id", entreprise.id)
        .eq("is_active", true)
        .ilike("nom", `%${searchQuery}%`)
        .limit(10);
      if (!articlesData?.length) return [];

      // Récupérer les prix de vente associés
      const articleIds = articlesData.map((a) => a.id);
      const { data: prix } = await supabase
        .from("prix_vente_articles")
        .select("article_id, station_id, prix_vente")
        .in("article_id", articleIds);

      return articlesData.map((a) => ({
        ...a,
        is_service: a.famille === "services",
        prix_vente_articles: (prix ?? [])
          .filter((p) => p.article_id === a.id)
          .map((p) => ({ prix_vente: p.prix_vente, station_id: p.station_id })),
      })) as ArticleResult[];
    },
    enabled: !!entreprise?.id && searchQuery.length >= 2,
  });

  // Open/get active shift
  const openShiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStationId) throw new Error("Sélectionnez une station");
      // Check existing open shift
      const { data: existing } = await supabase
        .from("shifts_boutique")
        .select("*")
        .eq("station_id", selectedStationId)
        .eq("statut", "en_cours")
        .single();

      if (existing) {
        setActiveShift(existing as ShiftBoutique);
        return existing;
      }

      // Créer nouveau shift
      type ShiftInsert =
        import("@/types/supabase").Database["public"]["Tables"]["shifts_boutique"]["Insert"];
      const newShift: ShiftInsert = { station_id: selectedStationId };
      const { data, error } = await supabase
        .from("shifts_boutique")
        .insert(newShift)
        .select("id, statut, date_ouverture, ca_total")
        .single();
      if (error) throw error;
      setActiveShift(data as unknown as ShiftBoutique);
      return data;
    },
    onSuccess: () => toast.success("Shift ouvert"),
    onError: (error) => toast.error(error.message),
  });

  const addToCart = useCallback(
    (article: ArticleResult) => {
      const prixVente =
        article.prix_vente_articles?.find(
          (p) => p.station_id === selectedStationId,
        )?.prix_vente ?? 0;

      setCart((prev) => {
        const existing = prev.find((item) => item.article.id === article.id);
        if (existing) {
          return prev.map((item) =>
            item.article.id === article.id
              ? { ...item, quantite: item.quantite + 1 }
              : item,
          );
        }
        return [...prev, { article, quantite: 1, prix_unitaire: prixVente }];
      });
      setSearchQuery("");
    },
    [selectedStationId],
  );

  const updateQuantite = (articleId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.article.id === articleId
            ? { ...item, quantite: item.quantite + delta }
            : item,
        )
        .filter((item) => item.quantite > 0),
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + item.quantite * item.prix_unitaire,
    0,
  );

  const handleCheckout = async () => {
    if (!activeShift) {
      toast.error("Aucun shift ouvert");
      return;
    }
    if (cart.length === 0) {
      toast.error("Panier vide");
      return;
    }
    if (!tresorerieId && paymentMode !== "credit_client") {
      toast.error("Sélectionnez un compte de trésorerie");
      return;
    }

    setIsProcessing(true);
    try {
      // Créer ticket (types sécurisés)
      type TicketInsert =
        import("@/types/supabase").Database["public"]["Tables"]["tickets_boutique"]["Insert"];
      const ticketInsert: TicketInsert = {
        shift_id: activeShift.id,
        station_id: selectedStationId || null,
        total,
      };
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets_boutique")
        .insert(ticketInsert)
        .select("id")
        .single();
      if (ticketError) throw ticketError;

      // Créer lignes ticket
      type LigneInsert =
        import("@/types/supabase").Database["public"]["Tables"]["lignes_ticket_boutique"]["Insert"];
      const lignesInserts: LigneInsert[] = cart.map((item) => ({
        ticket_id: ticket.id,
        article_id: item.article.id,
        quantite: item.quantite,
        prix_unitaire: item.prix_unitaire,
      }));
      const { error: lignesError } = await supabase
        .from("lignes_ticket_boutique")
        .insert(lignesInserts);
      if (lignesError) throw lignesError;

      // Créer paiement
      type PaiementInsert =
        import("@/types/supabase").Database["public"]["Tables"]["paiements_ticket_boutique"]["Insert"];
      const paiementInsert: PaiementInsert = {
        ticket_id: ticket.id,
        mode_paiement: paymentMode,
        tresorerie_id: tresorerieId || null,
        montant: total,
      };
      const { error: paiementError } = await supabase
        .from("paiements_ticket_boutique")
        .insert(paiementInsert);
      if (paiementError) throw paiementError;

      // Mettre à jour le CA du shift
      type ShiftUpdate =
        import("@/types/supabase").Database["public"]["Tables"]["shifts_boutique"]["Update"];
      const shiftUpdate: ShiftUpdate = {
        ca_total: (activeShift as { ca_total?: number }).ca_total ?? 0 + total,
      };
      await supabase
        .from("shifts_boutique")
        .update(shiftUpdate)
        .eq("id", activeShift.id);

      setLastTicketId(ticket.id);
      toast.success(`Ticket créé — Total : ${formatCurrency(total)}`);
      setCart([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la vente",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title="Point de Vente Boutique"
        description="Interface caisse décentralisée"
      />

      {!activeShift ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Station</Label>
              <Select
                value={selectedStationId}
                onValueChange={(v) => setSelectedStationId(v ?? "")}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner une station">
                    {
                      (stations ?? []).find((s) => s.id === selectedStationId)
                        ?.nom
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(stations ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => openShiftMutation.mutate()}
              disabled={!selectedStationId || openShiftMutation.isPending}
            >
              {openShiftMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ouvrir un shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product search */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">
                    Shift {activeShift.numero_shift}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {stations?.find((s) => s.id === selectedStationId)?.nom}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="pos-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un article par nom ou code-barres..."
                    className="pl-9"
                  />
                </div>

                {(articles ?? []).length > 0 && (
                  <div className="mt-2 border rounded-md overflow-hidden">
                    {(articles ?? []).map((article) => {
                      const prix =
                        article.prix_vente_articles?.find(
                          (p) => p.station_id === selectedStationId,
                        )?.prix_vente ?? 0;
                      return (
                        <button
                          key={article.id}
                          onClick={() => addToCart(article)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent border-b last:border-0 transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm">{article.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              {article.famille} · {article.unite}
                            </p>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(prix)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart items */}
            {cart.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Panier ({cart.length} article{cart.length > 1 ? "s" : ""})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.article.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.article.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.prix_unitaire)} /{" "}
                          {item.article.unite}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantite(item.article.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantite}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantite(item.article.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="w-24 text-right font-medium text-sm">
                        {formatCurrency(item.quantite * item.prix_unitaire)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter(
                              (i) => i.article.id !== item.article.id,
                            ),
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Checkout panel */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(total)}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Mode de paiement</Label>
                  <Select
                    value={paymentMode}
                    onValueChange={(v) => setPaymentMode(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="credit_client">
                        Crédit client
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMode !== "credit_client" && (
                  <div className="space-y-2">
                    <Label>Compte trésorerie</Label>
                    <Select
                      value={tresorerieId}
                      onValueChange={(v) => setTresorerieId(v ?? "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner...">
                          {
                            (tresoreries ?? []).find(
                              (t) => t.id === tresorerieId,
                            )?.libelle
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(tresoreries ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  Valider la vente
                </Button>

                {lastTicketId && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 no-print"
                    onClick={() =>
                      openPrintWindow(
                        `Ticket ${lastTicketId.slice(-8).toUpperCase()}`,
                        buildTicketPrintHtml({
                          ticket_id: lastTicketId,
                          station_nom: stations?.find(
                            (s) => s.id === selectedStationId,
                          )?.nom,
                          entreprise_nom: entreprise?.nom,
                          items:
                            cart.length > 0
                              ? cart.map((i) => ({
                                  nom: i.article.nom,
                                  quantite: i.quantite,
                                  prix_unitaire: i.prix_unitaire,
                                }))
                              : [],
                          total,
                          mode_paiement: paymentMode,
                        }),
                      )
                    }
                  >
                    <Printer className="w-4 h-4" />
                    Imprimer ticket
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
