import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, UserMinus, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost } from "@/components/admin-ui";
import { StatusBadge, profileStatusMeta } from "@/components/StatusBadge";
import { updateProfile, releaseProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/profils")({
  component: ProfilesPage,
});

type Profile = {
  id: string; profile_number: number; profile_name: string | null; profile_pin: string | null;
  client_id: string | null; start_date: string | null; end_date: string | null; status: string; notes: string | null;
};

function ProfilesPage() {
  const qc = useQueryClient();
  const upd = useServerFn(updateProfile);
  const rel = useServerFn(releaseProfile);
  const [editing, setEditing] = useState<Profile | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, full_name").order("full_name")).data || [],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-with-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_accounts")
        .select("id, account_label, total_slots, service:services(name), profiles:service_profiles(id, profile_number, profile_name, profile_pin, status, start_date, end_date, notes, client_id, client:clients(full_name))")
        .order("account_label");
      return data || [];
    },
  });

  const updMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (p: Partial<Profile> & { id: string }) => upd({ data: p as any }),
    onSuccess: () => { toast.success("Profil mis à jour"); setEditing(null); qc.invalidateQueries({ queryKey: ["accounts-with-profiles"] }); },
  });
  const relMut = useMutation({
    mutationFn: async (id: string) => rel({ data: { id } }),
    onSuccess: () => { toast.success("Slot libéré"); qc.invalidateQueries({ queryKey: ["accounts-with-profiles"] }); },
  });

  return (
    <>
      <PageHeader title="Profils & slots" subtitle="Vue d'ensemble des assignations par compte" />

      <div className="space-y-5">
        {accounts.map((acc) => {
          const profiles = (acc.profiles || []) as (Profile & { client: { full_name: string } | null })[];
          const occ = profiles.filter((p) => p.status === "occupe").length;
          const svc = acc.service as { name: string } | null;
          return (
            <div key={acc.id} className="card-elegant p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{svc?.name} · {acc.account_label}</h2>
                  <p className="text-xs text-muted-foreground">Occupation {occ}/{acc.total_slots}</p>
                </div>
                <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-[color:var(--primary)]" style={{ width: `${(occ / acc.total_slots) * 100}%` }} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {profiles.sort((a, b) => a.profile_number - b.profile_number).map((p) => {
                  const m = profileStatusMeta[p.status] || profileStatusMeta.libre;
                  return (
                    <div key={p.id} className="p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Profil {p.profile_number}</span>
                        <StatusBadge label={m.label} tone={m.tone} />
                      </div>
                      <div className="mt-1.5 text-sm font-medium">{p.client?.full_name || <span className="text-muted-foreground italic">Libre</span>}</div>
                      {p.profile_name && <div className="text-xs text-muted-foreground">{p.profile_name}{p.profile_pin ? ` · PIN ${p.profile_pin}` : ""}</div>}
                      {p.end_date && <div className="text-xs text-muted-foreground">Fin : {new Date(p.end_date).toLocaleDateString("fr-FR")}</div>}
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => setEditing(p)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs bg-background border border-border hover:bg-accent">
                          {p.client_id ? <><Edit2 className="w-3 h-3" /> Modifier</> : <><UserPlus className="w-3 h-3" /> Assigner</>}
                        </button>
                        {p.client_id && (
                          <button onClick={() => { if (confirm("Libérer ce slot ?")) relMut.mutate(p.id); }} className="px-2 py-1.5 rounded-md text-xs bg-background border border-border hover:bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)]" title="Libérer">
                            <UserMinus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Profil ${editing?.profile_number ?? ""}`} size="md">
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); updMut.mutate(editing); }}>
            <Field label="Client">
              <select className={inputCls} value={editing.client_id || ""} onChange={(e) => setEditing({ ...editing, client_id: e.target.value || null, status: e.target.value ? "occupe" : "libre" })}>
                <option value="">— Aucun (libre) —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom du profil"><input className={inputCls} value={editing.profile_name || ""} onChange={(e) => setEditing({ ...editing, profile_name: e.target.value })} /></Field>
              <Field label="PIN"><input className={inputCls} value={editing.profile_pin || ""} onChange={(e) => setEditing({ ...editing, profile_pin: e.target.value })} maxLength={20} /></Field>
              <Field label="Début"><input type="date" className={inputCls} value={editing.start_date || ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></Field>
              <Field label="Fin"><input type="date" className={inputCls} value={editing.end_date || ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} /></Field>
            </div>
            <Field label="Statut">
              <select className={inputCls} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {Object.entries(profileStatusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Notes"><textarea className={`${inputCls} min-h-[60px]`} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className={btnPrimary}>Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
