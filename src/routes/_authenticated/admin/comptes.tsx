import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost, btnGold } from "@/components/admin-ui";
import { StatusBadge, accountStatusMeta } from "@/components/StatusBadge";
import { saveServiceAccount, deleteServiceAccount, revealAdminPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/comptes")({
  component: AccountsPage,
});

type Account = {
  id: string; service_id: string; account_label: string; login_email: string; recovery_email: string | null;
  renewal_date: string | null; status: string; total_slots: number; notes: string | null; internal_owner: string | null;
  last_rotation_date: string | null;
};

function fmtDate(d?: string | null) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

function AccountsPage() {
  const qc = useQueryClient();
  const save = useServerFn(saveServiceAccount);
  const del = useServerFn(deleteServiceAccount);
  const reveal = useServerFn(revealAdminPassword);
  const [editing, setEditing] = useState<(Partial<Account> & { password?: string }) | null>(null);
  const [revealed, setRevealed] = useState<{ label: string; password: string } | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await supabase.from("services").select("id, name")).data || [],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_accounts")
        .select("id, service_id, account_label, login_email, recovery_email, renewal_date, status, total_slots, notes, internal_owner, last_rotation_date, created_at, service:services(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (p: Partial<Account> & { password?: string }) => save({ data: p as any }),
    onSuccess: () => { toast.success("Compte enregistré"); setEditing(null); qc.invalidateQueries({ queryKey: ["accounts"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["accounts"] }); },
  });
  const revealMut = useMutation({
    mutationFn: async (a: { id: string; label: string }) => {
      const r = await reveal({ data: { account_id: a.id } });
      return { ...r, label: a.label };
    },
    onSuccess: (res) => { setRevealed({ label: res.label, password: res.password }); toast.info("Consultation enregistrée"); },
  });

  return (
    <>
      <PageHeader
        title="Comptes service"
        subtitle="Tous les comptes que vous gérez pour vos clients"
        action={<button onClick={() => setEditing({ total_slots: 5, status: "disponible" })} className={btnGold}><Plus className="w-4 h-4" /> Nouveau compte</button>}
      />

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Compte</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Service</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Renouvellement</th>
                <th className="text-left px-4 py-3 font-medium">Statut</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((a) => {
                const meta = accountStatusMeta[a.status] || accountStatusMeta.disponible;
                const svc = a.service as { name: string } | null;
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.account_label}</div>
                      <div className="text-xs text-muted-foreground">{a.login_email} · {a.total_slots} slots</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{svc?.name}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{fmtDate(a.renewal_date)}</td>
                    <td className="px-4 py-3"><StatusBadge label={meta.label} tone={meta.tone} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => revealMut.mutate({ id: a.id, label: a.account_label })} title="Afficher mot de passe" className="p-2 rounded-md hover:bg-accent"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setEditing(a)} className="p-2 rounded-md hover:bg-accent"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm(`Supprimer ${a.account_label} ?`)) delMut.mutate(a.id); }} className="p-2 rounded-md text-[color:var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)]"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-10">Aucun compte enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Modifier le compte" : "Nouveau compte service"} size="lg">
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Service *">
                <select className={inputCls} value={editing.service_id || ""} onChange={(e) => setEditing({ ...editing, service_id: e.target.value })} required>
                  <option value="">— Choisir —</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Libellé *"><input className={inputCls} value={editing.account_label || ""} onChange={(e) => setEditing({ ...editing, account_label: e.target.value })} required /></Field>
              <Field label="Email de connexion *"><input type="email" className={inputCls} value={editing.login_email || ""} onChange={(e) => setEditing({ ...editing, login_email: e.target.value })} required /></Field>
              <Field label={editing.id ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}>
                <input type="password" className={inputCls} value={editing.password || ""} onChange={(e) => setEditing({ ...editing, password: e.target.value })} required={!editing.id} />
              </Field>
              <Field label="Email de récupération"><input type="email" className={inputCls} value={editing.recovery_email || ""} onChange={(e) => setEditing({ ...editing, recovery_email: e.target.value })} /></Field>
              <Field label="Date de renouvellement"><input type="date" className={inputCls} value={editing.renewal_date || ""} onChange={(e) => setEditing({ ...editing, renewal_date: e.target.value })} /></Field>
              <Field label="Nombre de slots *"><input type="number" min={1} max={50} className={inputCls} value={editing.total_slots ?? 5} onChange={(e) => setEditing({ ...editing, total_slots: parseInt(e.target.value || "1") })} disabled={!!editing.id} /></Field>
              <Field label="Statut">
                <select className={inputCls} value={editing.status || "disponible"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {Object.entries(accountStatusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Propriétaire interne"><input className={inputCls} value={editing.internal_owner || ""} onChange={(e) => setEditing({ ...editing, internal_owner: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><textarea className={`${inputCls} min-h-[60px]`} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className={btnPrimary} disabled={saveMut.isPending}>Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!revealed} onClose={() => setRevealed(null)} title="Mot de passe">
        {revealed && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{revealed.label}</p>
            <div className="p-4 rounded-lg bg-muted font-mono text-sm break-all">{revealed.password || "(vide)"}</div>
            <button onClick={() => { navigator.clipboard.writeText(revealed.password); toast.success("Copié"); }} className={btnGhost}>Copier</button>
          </div>
        )}
      </Modal>
    </>
  );
}
