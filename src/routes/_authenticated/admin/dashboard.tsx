import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, UserCheck, KeyRound, Layers, Wallet, AlertCircle, TrendingUp, Calendar,
  ShieldAlert, Clock, Tv, Palette, Clapperboard, Globe, Monitor, Film, ArrowUpRight,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/admin-ui";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: Dashboard,
});

function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " XOF";
}

const popularServices = [
  { name: "Netflix", icon: Monitor, gradient: "from-red-600 to-red-900", glow: "glow-red" },
  { name: "Prime Video", icon: Film, gradient: "from-[color:var(--cinema-blue)] to-cyan-700", glow: "glow-blue" },
  { name: "Canva Pro", icon: Palette, gradient: "from-[color:var(--cinema-purple)] to-violet-800", glow: "glow-purple" },
  { name: "CapCut Pro", icon: Clapperboard, gradient: "from-teal-500 to-[color:var(--cinema-blue)]", glow: "glow-blue" },
];

function Dashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre activité" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-elegant h-32 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  const t = data.totals;
  const occupancyRate = t.occupiedProfiles + t.freeProfiles > 0
    ? Math.round((t.occupiedProfiles / (t.occupiedProfiles + t.freeProfiles)) * 100)
    : 0;

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre activité LB Access Cloud" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Clients total" value={t.totalClients} accent="primary" />
        <StatCard icon={UserCheck} label="Clients actifs" value={t.activeClients} accent="success" />
        <StatCard icon={KeyRound} label="Comptes services" value={t.totalAccounts} accent="primary" />
        <StatCard icon={Layers} label="Profils occupés" value={`${t.occupiedProfiles}/${t.occupiedProfiles + t.freeProfiles}`} hint={`Taux : ${occupancyRate}%`} accent="gold" />
        <StatCard icon={Wallet} label="Revenu du mois" value={fmtMoney(t.currentMonthRevenue)} accent="success" />
        <StatCard icon={TrendingUp} label="En attente" value={fmtMoney(t.pendingAmount)} accent="warning" />
        <StatCard icon={Clock} label="Expirent sous 3j" value={t.expiring3Days} accent="danger" />
        <StatCard icon={ShieldAlert} label="Alertes sécurité" value={t.securityAlerts} accent="danger" />
      </div>

      {/* Charts + Expirations */}
      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="card-elegant p-5 lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[color:var(--primary)] opacity-[0.04] blur-[60px]" />
          <h2 className="font-display text-lg font-bold mb-1">Revenus (6 derniers mois)</h2>
          <p className="text-xs text-muted-foreground mb-4">Paiements encaissés en XOF</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyRevenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: "var(--gold)", strokeWidth: 0, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elegant p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[color:var(--warning)] opacity-[0.06] blur-[40px]" />
          <h2 className="font-display text-lg font-bold mb-1">Expirations imminentes</h2>
          <p className="text-xs text-muted-foreground mb-4">7 prochains jours</p>
          <div className="space-y-2.5">
            {data.expiringSoon.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune expiration imminente</p>
            )}
            {data.expiringSoon.map((p) => {
              const c = p.client as { full_name: string } | null;
              const a = p.service_account as { account_label: string; service: { name: string } | null } | null;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-background/50 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a?.service?.name} · {a?.account_label}</p>
                  </div>
                  <span className="text-xs font-semibold text-[color:var(--warning)] bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] px-2.5 py-1 rounded-full whitespace-nowrap">
                    {new Date(p.end_date as string).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popular services */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">Services populaires</h2>
          <Link to="/admin/services" className="text-xs text-[color:var(--gold)] font-medium hover:underline inline-flex items-center gap-1">
            Tous les services <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularServices.map((s) => (
            <div key={s.name} className="card-service p-5 relative overflow-hidden group">
              <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${s.gradient} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
              <div className="relative flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white ${s.glow}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">Service actif</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link to="/admin/services" className="text-xs text-[color:var(--gold)] font-medium hover:underline">
                  Gérer
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <Link to="/admin/clients" className="card-elegant p-5 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)] transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-[color:var(--primary)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-[color:var(--gold)] transition-colors">Gérer les clients</p>
              <p className="text-xs text-muted-foreground">{t.totalClients} enregistrés</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/alertes" className="card-elegant p-5 hover:border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-[color:var(--destructive)] transition-colors">Alertes sécurité</p>
              <p className="text-xs text-muted-foreground">{t.securityAlerts} en attente</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/comptes" className="card-elegant p-5 hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)] transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[color:var(--gold)] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-[color:var(--gold)] transition-colors">Comptes sources</p>
              <p className="text-xs text-muted-foreground">{t.totalAccounts} comptes</p>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
