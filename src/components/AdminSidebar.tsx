import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  KeyRound,
  Layers,
  CreditCard,
  Bell,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "./BrandLogo";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/services", label: "Services", icon: Package },
  { to: "/admin/comptes", label: "Comptes source", icon: KeyRound },
  { to: "/admin/profils", label: "Profils & slots", icon: Layers },
  { to: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { to: "/admin/alertes", label: "Alertes", icon: Bell },
  { to: "/admin/audit", label: "Journal d'audit", icon: History },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border min-h-screen sticky top-0">
      <div className="p-5 border-b border-sidebar-border">
        <BrandLogo size="md" inverted />
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-[color-mix(in_oklab,var(--gold)_20%,transparent)]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground border border-transparent",
              )}
            >
              <it.icon className={cn("w-4.5 h-4.5 shrink-0", active && "text-[color:var(--gold)]")} />
              <span className="truncate">{it.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] hover:text-[color:var(--destructive)] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-3">
        <BrandLogo size="sm" inverted />
      </div>
      <div className="overflow-x-auto flex gap-1 px-2 pb-2">
        {items.map((it) => {
          const active = pathname === it.to || pathname.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 border transition-colors",
                active
                  ? "bg-[color:var(--gold)] text-[color:var(--gold-foreground)] border-transparent"
                  : "border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent/40",
              )}
            >
              <it.icon className="w-3.5 h-3.5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
