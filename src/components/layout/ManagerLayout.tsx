"use client";

import { FusedLogo } from "@/components/common/FusedLogo";
import { NotificationCenter } from "@/components/messaging/NotificationCenter";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
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
  children?: NavItem[];
  badge?: number;
  badgeVariant?: "danger" | "warning";
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "",
    items: [
      {
        href: "/manager/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboard,
      },
      { href: "/manager/stations", label: "Mes stations", icon: Fuel },
    ],
  },
  {
    label: "Gestion",
    items: [
      {
        href: "/manager/structure",
        label: "Structure",
        icon: Settings,
        children: [
          {
            href: "/manager/parametres/comptes",
            label: "Plan comptable",
            icon: ClipboardList,
          },
          { href: "/manager/parametres/tiers", label: "Tiers", icon: Users },
          {
            href: "/manager/parametres/articles",
            label: "Articles / Produits",
            icon: Package,
          },
          {
            href: "/manager/parametres/prix-carburant",
            label: "Carburants",
            icon: Fuel,
          },
          {
            href: "/manager/parametres/tresorerie",
            label: "Trésorerie",
            icon: ShoppingCart,
          },
          {
            href: "/manager/parametres/camions",
            label: "Camions",
            icon: Building2,
          },
          {
            href: "/manager/parametres/services",
            label: "Services",
            icon: Wrench,
          },
          {
            href: "/manager/parametres/objectifs",
            label: "Objectifs & Seuils",
            icon: BarChart3,
          },
        ],
      },
      {
        href: "/manager/initialisation",
        label: "Initialisation",
        icon: ClipboardList,
      },
      {
        href: "/manager/traitement",
        label: "Traitement",
        icon: ShoppingCart,
        children: [
          {
            href: "/manager/traitements/achat-carburant",
            label: "Achat Carburant",
            icon: Fuel,
          },
          {
            href: "/manager/traitements/shift-carburant",
            label: "Vente Carburant",
            icon: Fuel,
          },
          {
            href: "/manager/traitements/achat-boutique",
            label: "Achat Boutique",
            icon: Package,
          },
          {
            href: "/manager/traitements/pos-boutique",
            label: "Vente Boutique (POS)",
            icon: ShoppingCart,
          },
          {
            href: "/manager/traitements/inventaire",
            label: "Inventaires",
            icon: ClipboardList,
          },
          {
            href: "/manager/traitements/operations",
            label: "Opérations",
            icon: Settings,
          },
          {
            href: "/manager/traitements/doleances",
            label: "Doléances",
            icon: AlertCircle,
            badge: 0,
            badgeVariant: "danger",
          },
        ],
      },
    ],
  },
  {
    label: "Analyse",
    items: [{ href: "/manager/rapports", label: "Rapports", icon: BarChart3 }],
  },
  {
    label: "Administration",
    items: [
      { href: "/manager/users", label: "Utilisateurs", icon: Users },
      { href: "/manager/notifications", label: "Notifications", icon: Bell },
      { href: "/manager/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

function SidebarContent({ onNavigate, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { logout, compte, entreprise } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const active = navSections
      .flatMap((s) => s.items)
      .find((i) => i.children?.some((c) => pathname.startsWith(c.href)));
    return active ? [active.href] : [];
  });

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = (name?: string | null) => {
    if (!name) return "?";
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
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-[9px]"}`}
        >
          <FusedLogo size={32} />
          {!collapsed && (
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
                Gestion station-service
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Station widget */}
      {entreprise && !collapsed && (
        <div
          className="mx-[10px] my-[8px] px-[11px] py-[8px]"
          style={{
            background: "var(--brand-light)",
            border: "0.5px solid var(--brand-bd)",
            borderRadius: 8,
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--brand-mid)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
            }}
          >
            Entreprise active
          </p>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              marginTop: 2,
            }}
            className="truncate"
          >
            {entreprise.nom}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto"
        style={{
          padding: collapsed ? "4px 4px" : "4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {navSections.map((section) => (
          <div key={section.label}>
            {section.label && !collapsed && (
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
            )}
            {collapsed && section.label && (
              <div
                style={{
                  borderTop: "0.5px solid var(--border)",
                  margin: "4px 6px",
                }}
              />
            )}
            {section.items.map((item) =>
              item.children ? (
                collapsed ? (
                  <Link
                    key={item.href}
                    href={item.children[0]?.href ?? item.href}
                    onClick={onNavigate}
                    title={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px 0",
                      borderRadius: 7,
                      fontSize: 12,
                      marginBottom: 1,
                      fontWeight: isActive(item.href) ? 600 : 400,
                      color: isActive(item.href)
                        ? "var(--brand-mid)"
                        : "rgba(255,255,255,0.45)",
                      background: isActive(item.href)
                        ? "var(--brand-light)"
                        : "transparent",
                      border: isActive(item.href)
                        ? "0.5px solid var(--brand-bd)"
                        : "0.5px solid transparent",
                      transition: "all 0.12s",
                    }}
                  >
                    <item.icon
                      className="shrink-0"
                      style={{
                        width: 18,
                        height: 18,
                        opacity: isActive(item.href) ? 1 : 0.7,
                      }}
                    />
                  </Link>
                ) : (
                  <div key={item.href}>
                    <button
                      onClick={() => toggleExpand(item.href)}
                      className={cn(
                        "flex items-center gap-2 w-full transition-all",
                        isActive(item.href)
                          ? "sf-nav-item-active"
                          : "sf-nav-item",
                      )}
                      style={{
                        padding: "8px 9px",
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: isActive(item.href) ? 600 : 400,
                        color: isActive(item.href)
                          ? "var(--brand-mid)"
                          : "rgba(255,255,255,0.45)",
                        background: isActive(item.href)
                          ? "var(--brand-light)"
                          : "transparent",
                        border: isActive(item.href)
                          ? "0.5px solid var(--brand-bd)"
                          : "0.5px solid transparent",
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "left",
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
                      <span className="flex-1">{item.label}</span>
                      {expandedItems.includes(item.href) ? (
                        <ChevronDown
                          style={{ width: 12, height: 12, opacity: 0.5 }}
                        />
                      ) : (
                        <ChevronRight
                          style={{ width: 12, height: 12, opacity: 0.5 }}
                        />
                      )}
                    </button>
                    {expandedItems.includes(item.href) && (
                      <div
                        style={{
                          marginLeft: 12,
                          paddingLeft: 10,
                          borderLeft: "1px solid var(--border)",
                          marginBottom: 2,
                        }}
                      >
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "7px 8px",
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: isActive(child.href) ? 600 : 400,
                              color: isActive(child.href)
                                ? "var(--brand-mid)"
                                : "rgba(255,255,255,0.4)",
                              background: isActive(child.href)
                                ? "var(--brand-light)"
                                : "transparent",
                              marginBottom: 1,
                              transition: "all 0.12s",
                            }}
                            className="sf-nav-child"
                          >
                            <child.icon
                              style={{ width: 12, height: 12, flexShrink: 0 }}
                            />
                            <span className="flex-1 truncate">
                              {child.label}
                            </span>
                            {child.badge !== undefined && child.badge > 0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 6px",
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  background:
                                    child.badgeVariant === "warning"
                                      ? "var(--color-warning-bg)"
                                      : "var(--color-danger-bg)",
                                  color:
                                    child.badgeVariant === "warning"
                                      ? "var(--color-warning)"
                                      : "var(--color-danger)",
                                  border: `0.5px solid ${child.badgeVariant === "warning" ? "var(--color-warning-bd)" : "var(--color-danger-bd)"}`,
                                }}
                              >
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : undefined,
                    gap: collapsed ? 0 : 8,
                    padding: collapsed ? "10px 0" : "8px 9px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: isActive(item.href) ? 600 : 400,
                    color: isActive(item.href)
                      ? "var(--brand-mid)"
                      : "rgba(255,255,255,0.45)",
                    background: isActive(item.href)
                      ? "var(--brand-light)"
                      : "transparent",
                    border: isActive(item.href)
                      ? "0.5px solid var(--brand-bd)"
                      : "0.5px solid transparent",
                    marginBottom: 1,
                    transition: "all 0.12s",
                  }}
                >
                  <item.icon
                    className="shrink-0"
                    style={{
                      width: collapsed ? 18 : 14,
                      height: collapsed ? 18 : 14,
                      opacity: isActive(item.href) ? 1 : 0.7,
                    }}
                  />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 6px",
                        borderRadius: 8,
                        fontWeight: 700,
                        background:
                          item.badgeVariant === "warning"
                            ? "var(--color-warning-bg)"
                            : "var(--color-danger-bg)",
                        color:
                          item.badgeVariant === "warning"
                            ? "var(--color-warning)"
                            : "var(--color-danger)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          padding: collapsed ? "10px 8px" : "10px 12px",
          borderTop: "0.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : undefined,
          gap: collapsed ? 0 : 9,
        }}
      >
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--brand)",
            fontSize: 10,
            fontWeight: 800,
            color: "white",
          }}
        >
          {initials(compte?.nom)}
        </div>
        {!collapsed && (
          <>
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
                {compte?.nom ?? "—"}
              </p>
              <p
                style={{ fontSize: 10, color: "var(--txt3, #4D6680)" }}
                className="truncate"
              >
                Gérant
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
          </>
        )}
      </div>
    </div>
  );
}

function TopBar({
  onMenuClick,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const pathname = usePathname();

  const pageTitle = (() => {
    if (pathname.includes("/dashboard")) return "Tableau de bord";
    if (pathname.includes("/stations")) return "Mes stations";
    if (pathname.includes("/parametres/comptes")) return "Plan comptable";
    if (pathname.includes("/parametres/tiers")) return "Tiers";
    if (pathname.includes("/parametres/articles")) return "Articles / Produits";
    if (pathname.includes("/parametres/prix-carburant")) return "Carburants";
    if (pathname.includes("/parametres/tresorerie")) return "Trésorerie";
    if (pathname.includes("/parametres/camions")) return "Camions";
    if (pathname.includes("/parametres/services")) return "Services";
    if (pathname.includes("/parametres/objectifs")) return "Objectifs & Seuils";
    if (pathname.includes("/structure")) return "Structure";
    if (pathname.includes("/initialisation")) return "Initialisation";
    if (pathname.includes("/traitements/achat-carburant"))
      return "Achat Carburant";
    if (pathname.includes("/traitements/shift-carburant"))
      return "Vente Carburant";
    if (pathname.includes("/traitements/achat-boutique"))
      return "Achat Boutique";
    if (pathname.includes("/traitements/pos-boutique"))
      return "Vente Boutique (POS)";
    if (pathname.includes("/traitements/inventaire")) return "Inventaires";
    if (pathname.includes("/traitements/operations")) return "Opérations";
    if (pathname.includes("/traitements/doleances")) return "Doléances";
    if (pathname.includes("/traitement")) return "Traitement";
    if (pathname.includes("/rapports")) return "Rapports";
    if (pathname.includes("/users")) return "Utilisateurs";
    if (pathname.includes("/notifications")) return "Notifications";
    if (pathname.includes("/parametres")) return "Paramètres";
    return "SuccessFuel";
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
        <button
          className="hidden md:flex items-center justify-center"
          onClick={onToggleSidebar}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            color: "var(--txt2, #8BA4BF)",
          }}
          title={sidebarCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen style={{ width: 18, height: 18 }} />
          ) : (
            <PanelLeftClose style={{ width: 18, height: 18 }} />
          )}
        </button>
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--foreground)",
              lineHeight: 1.1,
            }}
          >
            {pageTitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NotificationCenter />
      </div>
    </div>
  );
}

export function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarStore();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 transition-all duration-200"
        style={{ width: collapsed ? 60 : 230, overflow: "hidden" }}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0"
          style={{ width: 230, background: "var(--nav)" }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          onToggleSidebar={toggle}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
