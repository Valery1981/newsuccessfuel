"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_SECTIONS,
  type PermissionsRecord,
} from "@/lib/permissions";
import { createClient } from "@/utils/supabase/client";
import { PermissionSection } from "./PermissionSection";

const supabase = createClient();

interface UserPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionNom: string;
}

export function UserPermissionsModal({
  open,
  onClose,
  sessionId,
  sessionNom,
}: UserPermissionsModalProps) {
  const queryClient = useQueryClient();
  const { data: currentDroits, isLoading } = useQuery({
    queryKey: ["session-droits", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions_utilisateurs")
        .select("droits")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return (data.droits ?? {}) as PermissionsRecord;
    },
    enabled: open && !!sessionId,
  });

  // Track user changes on top of persisted droits (no useEffect needed)
  const [overrides, setOverrides] = useState<PermissionsRecord>({});
  const localDroits: PermissionsRecord = {
    ...(currentDroits ?? {}),
    ...overrides,
  };

  const saveMutation = useMutation({
    mutationFn: async (droits: PermissionsRecord) => {
      const { error } = await supabase
        .from("sessions_utilisateurs")
        .update({ droits: droits as Record<string, boolean> })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["session-droits", sessionId],
      });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Droits enregistrés");
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleChange = (key: string, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const activeCount = ALL_PERMISSION_KEYS.filter(
    (k) => localDroits[k] === true,
  ).length;

  const handleGrantAll = () => {
    const all: PermissionsRecord = {};
    ALL_PERMISSION_KEYS.forEach((k) => {
      all[k] = true;
    });
    setOverrides(all);
  };

  const handleRevokeAll = () => {
    setOverrides(
      Object.fromEntries(
        ALL_PERMISSION_KEYS.map((k) => [k, false]),
      ) as PermissionsRecord,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Droits — {sessionNom}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            {activeCount} / {ALL_PERMISSION_KEYS.length} droits actifs
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGrantAll}>
              Tout accorder
            </Button>
            <Button variant="outline" size="sm" onClick={handleRevokeAll}>
              Tout révoquer
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs
            defaultValue="Traitement"
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="shrink-0">
              {PERMISSION_SECTIONS.map((section) => (
                <TabsTrigger key={section} value={section}>
                  {section}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex-1 overflow-y-auto mt-3 pr-1">
              {PERMISSION_SECTIONS.map((section) => (
                <TabsContent key={section} value={section}>
                  <PermissionSection
                    section={section}
                    droits={localDroits}
                    onChange={handleChange}
                    disabled={saveMutation.isPending}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate(localDroits)}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
