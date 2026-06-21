import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost, btnGold } from "@/components/admin-ui";
import { StatusBadge, paymentMethodLabel, paymentStatusMeta } from "@/components/StatusBadge";
import { savePayment, deletePayment } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/paiements")({
  component: PaymentsPage,
});

type Payment = {
  id?: string; client_id: string; profile_id: string | null; service_account_id: string | null;
  amount: number; currency: string; payment_method: string; payment_date: string;
  period_start: string | null; period_end: string | null; status: string; notes: string | null;
};

function fmt(n: number, c = "XOF") { return new Intl.NumberFormat("fr-FR").format(n) + " " + c; }

function PaymentsPage() {
  const qc = useQueryClient();
  const save = useServerFn(savePayment);
  const del = useServerFn(deletePayment);
  const [editing, setEditing] = useState<Partial<Payment> | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, full_name").order("full_name")).data || [],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await supabase.from("payments").select("*, client:clients(full_name)").order("payment_date", { ascending: false })).data || [],
  });

  const saveMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (p: Partial<Payment>) => save({ data: p as any }),
    onSuccess: () => { toast.success("Paiement enregistré"); setEditing(null); qc.invalidateQueries({ queryKey: ["payments"] }); },
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["payments"] }); },
  });

  const total = payments.filter((p) => p.status === "paye").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader
        title="Paiements"
        subtitle={`Total encaissé : ${fmt(total)}`}
        action={<button onClick={() => setEditing({ status: "paye", payment_method: "mobile_money", currency: "XOF", payment_date: new Date().toISOString().slice(0, 10) })} className={btnGold}><Plus className="w-4 h-4" /> Nouveau paiement</button>}
      />

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Montant</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Méthode</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => {
                const sm = paymentStatusMeta[p.status] || paymentStatusMeta.paye;
                const c = p.client as { full_name: string } | null;
                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{new Date(p.payment_date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 font-medium">{c?.full_name}</td>
                    <td className="px-4 py-3 font-mono">{fmt(Number(p.amount), p.currency)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{paymentMethodLabel[p.payment_method]}</td>
                    <td className="px-4 py-3"><StatusBadge label={sm.label} tone={sm.tone} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm("Supprimer ?")) delMut.mutate(p.id); }} className="p-2 rounded-md text-[color:var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)]"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Aucun paiement.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Nouveau paiement" size="md">
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }}>
            <Field label="Client *">
              <select className={inputCls} value={editing.client_id || ""} onChange={(e) => setEditing({ ...editing, client_id: e.target.value })} required>
                <option value="">— Choisir —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Montant *"><input type="number" min={0} step="0.01" className={inputCls} value={editing.amount ?? ""} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) })} required /></Field>
              <Field label="Devise"><input className={inputCls} value={editing.currency || "XOF"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></Field>
              <Field label="Date *"><input type="date" className={inputCls} value={editing.payment_date || ""} onChange={(e) => setEditing({ ...editing, payment_date: e.target.value })} required /></Field>
              <Field label="Méthode">
                <select className={inputCls} value={editing.payment_method || "mobile_money"} onChange={(e) => setEditing({ ...editing, payment_method: e.target.value })}>
                  {Object.entries(paymentMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Période début"><input type="date" className={inputCls} value={editing.period_start || ""} onChange={(e) => setEditing({ ...editing, period_start: e.target.value })} /></Field>
              <Field label="Période fin"><input type="date" className={inputCls} value={editing.period_end || ""} onChange={(e) => setEditing({ ...editing, period_end: e.target.value })} /></Field>
            </div>
            <Field label="Statut">
              <select className={inputCls} value={editing.status || "paye"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {Object.entries(paymentStatusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Notes"><textarea className={`${inputCls} min-h-[60px]`} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className={btnPrimary} disabled={saveMut.isPending}>Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
