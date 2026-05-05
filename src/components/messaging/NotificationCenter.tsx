"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { cn, formatDate } from "@/lib/utils";
import {
  getNotifications,
  markAllNotifsAsRead,
  markNotifAsRead,
  type NotificationRow,
} from "@/services/notificationService";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  nouvelle_doleance: { label: "Doléance", color: "text-red-500" },
  doleance_prise_en_charge: {
    label: "Prise en charge",
    color: "text-blue-500",
  },
  doleance_reglee: { label: "Réglée", color: "text-green-500" },
  stock_alerte: { label: "Stock", color: "text-amber-500" },
  echeance_proche: { label: "Échéance", color: "text-orange-500" },
  station_a_valider: { label: "Validation", color: "text-violet-500" },
};

interface NotificationCenterProps {
  viewAllHref?: string;
}

export function NotificationCenter({
  viewAllHref = "/manager/notifications",
}: NotificationCenterProps) {
  const { compte } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useRealtimeNotifications();

  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ["notifications", compte?.id],
    queryFn: () => getNotifications(compte!.id),
    enabled: !!compte?.id,
    staleTime: 60 * 1000,
  });

  const unreadCount = notifications.filter((n) => !n.is_lue).length;

  async function handleClick(n: NotificationRow) {
    if (!n.is_lue) {
      await markNotifAsRead(n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.reference_type === "doleance") {
      router.push(
        viewAllHref.includes("partner")
          ? "/partner/doleances"
          : "/manager/doleances",
      );
    }
  }

  async function handleMarkAll() {
    if (!compte?.id) return;
    await markAllNotifsAsRead(compte.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Toutes les notifications marquées comme lues");
  }

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 px-2"
              onClick={handleMarkAll}
            >
              <CheckCheck className="w-3 h-3" />
              Tout lire
            </Button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Bell className="w-6 h-6 opacity-30" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            notifications.slice(0, 8).map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? {
                label: n.type,
                color: "text-gray-400",
              };
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors",
                    !n.is_lue && "bg-primary/5 border-l-2 border-l-primary",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-wide leading-none",
                            cfg.color,
                          )}
                        >
                          {cfg.label}
                        </span>
                        {!n.is_lue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug mt-0.5">
                        {n.titre}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDate(n.created_at ?? "")}
                      </p>
                    </div>
                    {n.reference_id && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => router.push(viewAllHref)}
            >
              Voir toutes les notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
