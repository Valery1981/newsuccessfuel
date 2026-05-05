"use client";

import { FusedLogo } from "@/components/common/FusedLogo";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  Bug,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Sections superadmin selon Guide §2 (Superadmin)
const navSections: NavSection[] = [
  {
    label: "Plateforme",
    items: [
      {
        href: "/admin/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
      },
      { href: "/admin/users", label: "Partenaires & Comptes", icon: Users },
      {
        href: "/admin/stations",
        label: "Validation Stations",
        icon: ShieldCheck,
        badge: 0,
      },
      { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/revenue", label: "Revenus", icon: TrendingUp },
      { href: "/admin/expenses", label: "Dépenses", icon: Receipt },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/audit-logs", label: "Audit & Logs", icon: ScrollText },
      { href: "/admin/bug-reports", label: "Signalements", icon: Bug },
      { href: "/admin/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

const PURPLE = "#8B5CF6";
const PURPLE_BG = "rgba(139,92,246,0.10)";
const PURPLE_BD = "rgba(139,92,246,0.22)";

interface SidebarProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { logout, compte } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = (name?: string | null) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "var(--nav)",
        borderRight: "0.5px solid var(--border)",
      }}
    >
      {/* Brand */}
      <div
        className="px-4 py-[14px]"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-[9px]">
          <FusedLogo size={32} />
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.3px",
                lineHeight: 1,
              }}
            >
              SuccessFuel
            </p>
            <p
              style={{
                fontSize: "9.5px",
                color: "rgba(255,255,255,0.35)",
                marginTop: 1,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Super Admin
            </p>
          </div>
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 5,
              fontWeight: 700,
              background: PURPLE_BG,
              color: PURPLE,
              border: `0.5px solid ${PURPLE_BD}`,
            }}
          >
            SA
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{
          padding: "4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {navSections.map((section) => (
          <div key={section.label}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--txt4, #2E4560)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                padding: "9px 8px 3px",
              }}
            >
              {section.label}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 9px",
                  borderRadius: 7,
                  fontSize: 12,
                  marginBottom: 1,
                  fontWeight: isActive(item.href) ? 600 : 400,
                  color: isActive(item.href)
                    ? PURPLE
                    : "rgba(255,255,255,0.45)",
                  background: isActive(item.href) ? PURPLE_BG : "transparent",
                  border: isActive(item.href)
                    ? `0.5px solid ${PURPLE_BD}`
                    : "0.5px solid transparent",
                  transition: "all 0.12s",
                }}
              >
                <item.icon
                  className="shrink-0"
                  style={{
                    width: 14,
                    height: 14,
                    opacity: isActive(item.href) ? 1 : 0.7,
                  }}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 8,
                      fontWeight: 700,
                      background: "var(--color-danger-bg)",
                      color: "var(--color-danger)",
                      border: "0.5px solid var(--color-danger-bd)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "0.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: PURPLE,
            fontSize: 10,
            fontWeight: 800,
            color: "white",
          }}
        >
          {initials(compte?.nom)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              lineHeight: 1.2,
            }}
            className="truncate"
          >
            {compte?.nom ?? "Super Admin"}
          </p>
          <p style={{ fontSize: 10, color: "var(--txt3, #4D6680)" }}>
            Superadmin
          </p>
        </div>
        <button
          onClick={logout}
          title="Déconnexion"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            color: "rgba(255,255,255,0.3)",
          }}
          className="hover:text-red-400 transition-colors"
        >
          <LogOut style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  const pageTitle = (() => {
    if (pathname.includes("/dashboard")) return "Tableau de bord Plateforme";
    if (pathname.includes("/users")) return "Partenaires & Comptes";
    if (pathname.includes("/stations")) return "Validation des Stations";
    if (pathname.includes("/subscriptions")) return "Abonnements";
    if (pathname.includes("/revenue")) return "Revenus";
    if (pathname.includes("/expenses")) return "Dépenses";
    if (pathname.includes("/audit-logs")) return "Audit & Logs";
    if (pathname.includes("/bug-reports")) return "Signalements";
    if (pathname.includes("/settings")) return "Paramètres";
    return "Administration";
  })();

  return (
    <div
      style={{
        background: "var(--card)",
        borderBottom: "0.5px solid var(--border)",
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 50,
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <button
          className="md:hidden"
          onClick={onMenuClick}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "var(--txt2, #8BA4BF)",
          }}
        >
          <Menu style={{ width: 18, height: 18 }} />
        </button>
        <p
          style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}
        >
          {pageTitle}
        </p>
      </div>
      <span
        style={{
          fontSize: 10,
          padding: "3px 10px",
          borderRadius: 5,
          fontWeight: 700,
          background: PURPLE_BG,
          color: PURPLE,
          border: `0.5px solid ${PURPLE_BD}`,
        }}
      >
        Super Admin
      </span>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <aside
        className="hidden md:flex flex-col shrink-0"
        style={{ width: 230 }}
      >
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0"
          style={{ width: 230, background: "var(--nav)" }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
