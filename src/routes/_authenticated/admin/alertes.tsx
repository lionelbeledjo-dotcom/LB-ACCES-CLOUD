import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, KeyRound, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PageHeader, btnGhost } from "@/components/admin-ui";
import { toast } from "sonner";
import { resolveSecurityAlert } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/alertes")({
  component: AlertsPage,
});

function fmt(d: string) { return new Date(d).toLocaleDateString("fr-FR"); }
function fmtTime(d: string) { return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }

const severityColors: Record<string, string> = {
  high: "var(--destructive)",
  medium: "var(--warning)",
  low: "var(--muted-foreground)",
};

function AlertsPage() {
  const qc = useQueryClient();
  const resolve = useServerFn(resolveSecurityAlert);
  const todayStr = new Date().toISOString().slice(0, 10);
  const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const { data: securityAlerts = [] } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => (await supabase
      .from("security_alerts" as never)
      .select("id, alert_type, severity, description, created_at, is_resolved, client_id, client:clients(full_name)" as never)
      .eq("is_resolved" as never, false)
      .order("created_at" as never, { ascending: false })
      .limit(20)).data || [],
  });

  const { data: expiring3Days = [] } = useQuery({
    queryKey: ["alerts-expiring-3d"],
    queryFn: async () => (await supabase
      .from("service_profiles")
      .select("id, end_date, client:clients(full_name), service_account:service_accounts(account_label, service:services(name))")
      .not("end_date", "is", null).lte("end_date", in3).gte("end_date", todayStr).eq("status", "occupe")
      .order("end_date")).data || [],
  });

  const { data: expiringProfiles = [] } = useQuery({
    queryKey: ["alerts-expiring"],
    queryFn: async () => (await supabase
      .from("service_profiles")
      .select("id, end_date, client:clients(full_name), service_account:service_accounts(account_label, service:services(name))")
      .not("end_date", "is", null).lte("end_date", in7).gt("end_date", in3).eq("status", "occupe")
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

  const resolveMut = useMutation({
    mutationFn: async (id: string) => resolve({ data: { id } }),
    onSuccess: () => { toast.success("Alerte résolue"); qc.invalidateQueries({ queryKey: ["security-alerts"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <>
      <PageHeader title="Alertes" subtitle="Vue consolidée des actions à mener" />

      {/* Security Alerts Section */}
      {(securityAlerts as Array<{ id: string; alert_type: string; severity: string; description: string; created_at: string; client: { full_name: string } | null }>).length > 0 && (
        <div className="card-elegant p-5 mb-5 border-l-4" style={{ borderLeftColor: "var(--destructive)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[color:var(--destructive)]">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold">Alertes de sécurité</h2>
              <p className="text-xs text-muted-foreground">Activités suspectes détectées automatiquement</p>
            </div>
            <span className="text-2xl font-display font-semibold text-[color:var(--destructive)]">{(securityAlerts as unknown[]).length}</span>
          </div>
          <div className="space-y-2">
            {(securityAlerts as Array<{ id: string; alert_type: string; severity: string; description: string; created_at: string; client: { full_name: string } | null }>).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: severityColors[alert.severity] || severityColors.medium }} />
                    <p className="text-sm font-medium truncate">{alert.description}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.client?.full_name || "—"} · {fmtTime(alert.created_at)} · {alert.alert_type.replace(/_/g, " ")}
                  </p>
                </div>
                <button
                  onClick={() => resolveMut.mutate(alert.id)}
                  className={`${btnGhost} text-xs gap-1`}
                  disabled={resolveMut.isPending}
                  title="Marquer comme résolu"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Résoudre
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card icon={AlertTriangle} title="Expirent dans 3 jours" tone="danger" count={expiring3Days.length}>
          {expiring3Days.map((p) => {
            const c = p.client as { full_name: string } | null;
            const a = p.service_account as { account_label: string; service: { name: string } | null } | null;
            return (
              <Row key={p.id} title={c?.full_name || ""} subtitle={`${a?.service?.name} · ${a?.account_label}`} side={fmt(p.end_date as string)} />
            );
          })}
        </Card>

        <Card icon={Clock} title="Expirent dans 4-7 jours" tone="warning" count={expiringProfiles.length}>
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
