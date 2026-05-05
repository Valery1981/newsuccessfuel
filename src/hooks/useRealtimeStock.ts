"use client";

import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Subscribes to real-time INSERT events on lignes_ticket_boutique table
 * to invalidate stock queries when sales occur.
 * Per Guide §10.4: Stock boutique mis à jour en temps réel à chaque vente.
 */
export function useRealtimeStock() {
  const { entreprise } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!entreprise?.id) return;

    const supabase = createClient();
    const channelName = `stock-boutique-${entreprise.id}`;

    // Remove existing channel if any
    const existing = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    // Subscribe to ticket line inserts (sales)
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lignes_ticket_boutique",
        },
        () => {
          // Invalidate stock-related queries
          queryClient.invalidateQueries({ queryKey: ["articles"] });
          queryClient.invalidateQueries({ queryKey: ["stock-boutique"] });
          queryClient.invalidateQueries({ queryKey: ["stocks"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entreprise?.id, queryClient]);
}
