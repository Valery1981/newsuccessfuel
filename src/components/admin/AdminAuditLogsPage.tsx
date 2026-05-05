"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Download, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageLoading } from "@/components/common/LoadingSpinner";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportCsv } from "@/lib/exportCsv";
import { adminService } from "@/services/adminService";

const PAGE_SIZE = 20;

const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "VALIDATE",
  "SUSPEND",
];

const ACTION_STYLES: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  INSERT: "bg-green-100 text-green-700",
  UPDATE: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
  VALIDATE: "bg-emerald-100 text-emerald-700",
  SUSPEND: "bg-orange-100 text-orange-700",
};

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("toutes");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const actionPourApi = actionFilter === "toutes" ? undefined : actionFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", page, actionFilter, dateDebut, dateFin],
    queryFn: () =>
      adminService.getAuditLogs(
        page,
        PAGE_SIZE,
        actionPourApi,
        dateDebut || undefined,
        dateFin || undefined,
      ),
  });

  const logs = data?.data ?? [];
  const total = data?.count ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const resetFilters = () => {
    setActionFilter("toutes");
    setDateDebut("");
    setDateFin("");
    setPage(0);
  };

  const hasFilters = actionFilter !== "toutes" || dateDebut || dateFin;

  const handleExport = () => {
    if (!logs.length) return;
    exportCsv(
      logs.map((l) => ({
        Date: format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
        Action: l.action,
        Table: l.table_cible ?? "",
        Compte: l.comptes?.nom ?? "",
        Entreprise: l.entreprises?.nom ?? "",
        IP: l.ip_address ?? "",
      })),
      "audit-logs",
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Journal d'audit"
        description="Historique complet des actions effectuées dans le système"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            Exporter CSV
          </Button>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Action</Label>
          <Select
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v ?? "toutes");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date début</Label>
          <Input
            type="date"
            className="w-40"
            value={dateDebut}
            onChange={(e) => {
              setDateDebut(e.target.value);
              setPage(0);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date fin</Label>
          <Input
            type="date"
            className="w-40"
            value={dateFin}
            onChange={(e) => {
              setDateFin(e.target.value);
              setPage(0);
            }}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Réinitialiser
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aucun log d'audit"
          description="Aucune entrée ne correspond aux filtres sélectionnés."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const actionStyle =
                    ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-600";
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(
                          new Date(log.created_at),
                          "dd/MM/yyyy HH:mm:ss",
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionStyle}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.table_cible ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.comptes?.nom ?? "—"}
                      </TableCell>
                      <TableCell>{log.entreprises?.nom ?? "—"}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {log.ip_address ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} entrée{total > 1 ? "s" : ""} au total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Page {page + 1} / {pageCount || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
