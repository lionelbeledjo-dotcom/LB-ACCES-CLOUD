import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserCheck, KeyRound, Layers, Wallet, AlertCircle, TrendingUp, Calendar } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: Dashboard,
});

function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " XOF";
}

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Clients total" value={t.totalClients} accent="primary" />
        <StatCard icon={UserCheck} label="Clients actifs" value={t.activeClients} accent="success" />
        <StatCard icon={KeyRound} label="Comptes services" value={t.totalAccounts} accent="primary" />
        <StatCard icon={Layers} label="Profils occupés" value={`${t.occupiedProfiles}/${t.occupiedProfiles + t.freeProfiles}`} hint={`Taux d'occupation ${occupancyRate}%`} accent="gold" />
        <StatCard icon={Wallet} label="Revenu du mois" value={fmtMoney(t.currentMonthRevenue)} accent="success" />
        <StatCard icon={TrendingUp} label="Paiements en attente" value={fmtMoney(t.pendingAmount)} accent="warning" />
        <StatCard icon={AlertCircle} label="Clients suspendus" value={t.suspendedClients} accent="danger" />
        <StatCard icon={Calendar} label="Expirent sous 7j" value={data.expiringSoon.length} accent="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="card-elegant p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold mb-1">Revenus (6 derniers mois)</h2>
          <p className="text-xs text-muted-foreground mb-4">Paiements encaissés en XOF</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyRevenue}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: "var(--gold)", strokeWidth: 0, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-elegant p-5">
          <h2 className="font-display text-lg font-semibold mb-1">Expirations imminentes</h2>
          <p className="text-xs text-muted-foreground mb-4">7 prochains jours</p>
          <div className="space-y-2">
            {data.expiringSoon.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune expiration imminente</p>
            )}
            {data.expiringSoon.map((p) => {
              const c = p.client as { full_name: string } | null;
              const a = p.service_account as { account_label: string; service: { name: string } | null } | null;
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a?.service?.name} · {a?.account_label}</p>
                  </div>
                  <span className="text-xs font-medium text-[color:var(--warning-foreground)] bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] px-2 py-0.5 rounded-full whitespace-nowrap">
                    {new Date(p.end_date as string).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
