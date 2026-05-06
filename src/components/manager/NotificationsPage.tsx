"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  is_lue: boolean;
  created_at: string;
};

const typeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  error: { icon: AlertCircle, color: "text-red-500" },
  success: { icon: CheckCircle, color: "text-green-500" },
};

export function NotificationsPage() {
  const { compte } = useAuthStore();
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", compte?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, titre, message, is_lue, created_at")
        .eq("destinataire_compte_id", compte!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!compte?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_lue: true, lue_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_lue: true, lue_at: new Date().toISOString() })
        .eq("destinataire_compte_id", compte!.id)
        .eq("is_lue", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Toutes les notifications marquées comme lues");
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_lue).length ?? 0;

  if (isLoading) return <PageLoading />;

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous n'avez pas encore de notifications."
        />
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type] ?? typeConfig.info;
            const Icon = config.icon;
            return (
              <Card
                key={notification.id}
                className={cn(
                  "transition-colors cursor-pointer",
                  !notification.is_lue && "border-primary/30 bg-primary/5",
                )}
                onClick={() =>
                  !notification.is_lue &&
                  markReadMutation.mutate(notification.id)
                }
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <Icon
                    className={cn("w-4 h-4 mt-0.5 shrink-0", config.color)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          !notification.is_lue && "font-semibold",
                        )}
                      >
                        {notification.titre}
                      </p>
                      {!notification.is_lue && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  {notification.is_lue && (
                    <BellOff className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
