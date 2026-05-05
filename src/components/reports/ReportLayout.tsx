"use client";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PrintButton } from "@/components/reports/PrintButton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface ReportLayoutProps {
  title: string;
  description?: string;
  backHref?: string;
  onExport?: () => void;
  onPrint?: () => void;
  children: ReactNode;
}

export function ReportLayout({
  title,
  description,
  backHref = "/manager/rapports",
  onExport,
  onPrint,
  children,
}: ReportLayoutProps) {
  return (
    <PageContainer>
      <div className="flex items-center gap-2 mb-1 no-print">
        <Link href={backHref}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Rapports
          </Button>
        </Link>
      </div>
      <div className="flex items-start justify-between">
        <PageHeader title={title} description={description} />
        <div className="flex items-center gap-2 mt-1 no-print">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter CSV
            </Button>
          )}
          <PrintButton onClick={onPrint} />
        </div>
      </div>
      {children}
    </PageContainer>
  );
}
