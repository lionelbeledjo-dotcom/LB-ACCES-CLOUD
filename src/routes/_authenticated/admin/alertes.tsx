import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, KeyRound, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/alertes")({
  component: AlertsPage,
});

function fmt(d: string) { return new Date(d).toLocaleDateString("fr-FR"); }

function AlertsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const { data: expiringProfiles = [] } = useQuery({
    queryKey: ["alerts-expiring"],
    queryFn: async () => (await supabase
      .from("service_profiles")
      .select("id, end_date, client:clients(full_name), service_account:service_accounts(account_label, service:services(name))")
      .not("end_date", "is", null).lte("end_date", in7).gte("end_date", todayStr).eq("status", "occupe")
      .order("end_date")).data || [],
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ["alerts-pending-pay"],
    queryFn: async () => (await supabase
      .from("payments").select("id, amount, currency, client:clients(full_name), payment_date")
      .eq("status", "en_attente").order("payment_date")).data || [],
  });

  const { data: fullAccounts = [] } = useQuery({
    queryKey: ["alerts-full-accounts"],
    queryFn: async () => (await supabase.from("service_accounts").select("id, account_label, service:services(name)").eq("status", "complet")).data || [],
  });

  const { data: toRotate = [] } = useQuery({
    queryKey: ["alerts-rotation"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase.from("service_accounts").select("id, account_label, last_rotation_date, service:services(name)").or(`last_rotation_date.lt.${cutoff},last_rotation_date.is.null`);
      return data || [];
    },
  });

  return (
    <>
      <PageHeader title="Alertes" subtitle="Vue consolidée des actions à mener" />

      <div className="grid lg:grid-cols-2 gap-5">
        <Card icon={Clock} title="Profils expirant (7 jours)" tone="warning" count={expiringProfiles.length}>
          {expiringProfiles.map((p) => {
            const c = p.client as { full_name: string } | null;
            const a = p.service_account as { account_label: string; service: { name: string } | null } | null;
            return (
              <Row key={p.id} title={c?.full_name || ""} subtitle={`${a?.service?.name} · ${a?.account_label}`} side={fmt(p.end_date as string)} />
            );
          })}
        </Card>

        <Card icon={AlertTriangle} title="Paiements en attente" tone="danger" count={pendingPayments.length}>
          {pendingPayments.map((p) => {
            const c = p.client as { full_name: string } | null;
            return <Row key={p.id} title={c?.full_name || ""} subtitle={fmt(p.payment_date)} side={`${new Intl.NumberFormat("fr-FR").format(Number(p.amount))} ${p.currency}`} />;
          })}
        </Card>

        <Card icon={KeyRound} title="Comptes complets" tone="info" count={fullAccounts.length}>
          {fullAccounts.map((a) => {
            const s = a.service as { name: string } | null;
            return <Row key={a.id} title={a.account_label} subtitle={s?.name || ""} />;
          })}
        </Card>

        <Card icon={RefreshCw} title="Credentials à rotater (>90j)" tone="warning" count={toRotate.length}>
          {toRotate.map((a) => {
            const s = a.service as { name: string } | null;
            return <Row key={a.id} title={a.account_label} subtitle={s?.name || ""} side={a.last_rotation_date ? fmt(a.last_rotation_date) : "Jamais"} />;
          })}
        </Card>
      </div>
    </>
  );
}

function Card({ icon: Icon, title, count, tone, children }: { icon: React.ComponentType<{ className?: string }>; title: string; count: number; tone: "warning" | "danger" | "info"; children: React.ReactNode }) {
  const colors = {
    warning: "var(--warning)",
    danger: "var(--destructive)",
    info: "var(--primary)",
  }[tone];
  return (
    <div className="card-elegant p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklab, ${colors} 14%, transparent)`, color: colors }}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold">{title}</h2>
        </div>
        <span className="text-2xl font-display font-semibold" style={{ color: colors }}>{count}</span>
      </div>
      <div className="space-y-1.5">
        {count === 0 && <p className="text-xs text-muted-foreground text-center py-3">Rien à signaler</p>}
        {children}
      </div>
    </div>
  );
}

function Row({ title, subtitle, side }: { title: string; subtitle?: string; side?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 text-sm">
      <div className="min-w-0">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {side && <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{side}</span>}
    </div>
  );
}
