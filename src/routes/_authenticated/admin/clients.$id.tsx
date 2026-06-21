import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/admin-ui";
import { StatusBadge, clientStatusMeta, profileStatusMeta, paymentMethodLabel, paymentStatusMeta } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  component: ClientDetail,
});

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(n: number, c = "XOF") {
  return new Intl.NumberFormat("fr-FR").format(n) + " " + c;
}

function ClientDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/clients/$id" });

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["client-assignments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_profiles")
        .select("id, profile_number, profile_name, profile_pin, status, start_date, end_date, service_account:service_accounts(account_label, login_email, service:services(name))")
        .eq("client_id", id);
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments", id],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("client_id", id).order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const { data: codes = [] } = useQuery({
    queryKey: ["client-codes", id],
    queryFn: async () => {
      const { data } = await supabase.from("client_access_codes").select("*").eq("client_id", id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (!client) return <div className="card-elegant h-64 animate-pulse" />;
  const meta = clientStatusMeta[client.status] || clientStatusMeta.actif;

  return (
    <>
      <Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <PageHeader title={client.full_name} subtitle={client.notes || undefined} action={<StatusBadge label={meta.label} tone={meta.tone} />} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card-elegant p-5 space-y-3">
          <h2 className="font-display text-lg mb-2">Contact</h2>
          <InfoLine icon={Phone} label="Téléphone" value={client.phone} />
          <InfoLine icon={MessageCircle} label="WhatsApp" value={client.whatsapp} />
          <InfoLine icon={Mail} label="Email" value={client.email} />
          <InfoLine icon={MapPin} label="Ville" value={client.city} />
        </div>

        <div className="card-elegant p-5 lg:col-span-2">
          <h2 className="font-display text-lg mb-3">Accès assignés</h2>
          {assignments.length === 0 && <p className="text-sm text-muted-foreground">Aucun accès assigné.</p>}
          <div className="space-y-2">
            {assignments.map((a) => {
              const acc = a.service_account as { account_label: string; login_email: string; service: { name: string } | null } | null;
              const pm = profileStatusMeta[a.status] || profileStatusMeta.libre;
              return (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{acc?.service?.name} · {acc?.account_label}</div>
                    <div className="text-xs text-muted-foreground">Profil {a.profile_number} · {a.profile_name || "—"} · fin {fmtDate(a.end_date)}</div>
                  </div>
                  <StatusBadge label={pm.label} tone={pm.tone} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-elegant p-5 lg:col-span-2">
          <h2 className="font-display text-lg mb-3">Historique des paiements</h2>
          {payments.length === 0 && <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>}
          <div className="space-y-2">
            {payments.map((p) => {
              const sm = paymentStatusMeta[p.status] || paymentStatusMeta.paye;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                  <div>
                    <div className="font-medium">{fmtMoney(Number(p.amount), p.currency)}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.payment_date)} · {paymentMethodLabel[p.payment_method]}</div>
                  </div>
                  <StatusBadge label={sm.label} tone={sm.tone} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-elegant p-5">
          <h2 className="font-display text-lg mb-3">Codes d'accès</h2>
          {codes.length === 0 && <p className="text-sm text-muted-foreground">Aucun code.</p>}
          <div className="space-y-2">
            {codes.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-muted/40 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-mono">{c.code_prefix}-••</span>
                  {c.is_active ? <StatusBadge label="Actif" tone="success" /> : <StatusBadge label="Inactif" tone="neutral" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Créé {fmtDate(c.created_at)} · {c.last_used_at ? `Dernier accès ${fmtDate(c.last_used_at)}` : "Jamais utilisé"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-muted-foreground text-xs uppercase tracking-wider w-20">{label}</span>
      <span>{value}</span>
    </div>
  );
}
