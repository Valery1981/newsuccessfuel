"use client";

import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Subscribes to real-time INSERT events on the notifications table
 * filtered to the current user's compte_id.
 * Single channel per user — cleaned up on unmount.
 * Per §18 Guide: only doléances use Realtime (not ventes/stocks).
 */
export function useRealtimeNotifications() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!compte?.id) return;

    const supabase = createClient();
    const channelName = `notif-${compte.id}`;

    const existing = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `destinataire_compte_id=eq.${compte.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          const n = payload.new as { titre?: string; message?: string | null };
          toast(n.titre ?? "Nouvelle notification", {
            description: n.message ?? undefined,
            duration: 5000,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [compte?.id, queryClient]);
}
