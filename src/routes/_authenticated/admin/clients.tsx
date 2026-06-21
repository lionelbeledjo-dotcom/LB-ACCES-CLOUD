import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, KeyRound, Edit2, Trash2, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost, btnDanger, btnGold, EmptyState } from "@/components/admin-ui";
import { StatusBadge, clientStatusMeta } from "@/components/StatusBadge";
import { saveClient, deleteClient, generateClientCode } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsPage,
});

type Client = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

function ClientsPage() {
  const qc = useQueryClient();
  const save = useServerFn(saveClient);
  const del = useServerFn(deleteClient);
  const genCode = useServerFn(generateClientCode);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{ clientName: string; code: string } | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Client>) => save({ data: payload as Parameters<typeof save>[0]["data"] }),
    onSuccess: () => {
      toast.success("Client enregistré");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Client supprimé");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const codeMutation = useMutation({
    mutationFn: async ({ id, expiresAt }: { id: string; expiresAt?: string }) =>
      genCode({ data: { client_id: id, expires_at: expiresAt || null } }),
    onSuccess: (res, vars) => {
      const c = clients.find((x) => x.id === vars.id);
      setGeneratedCode({ clientName: c?.full_name || "", code: res.code });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const filtered = clients.filter((c) => {
    const matchSearch = !search || [c.full_name, c.phone, c.email, c.city].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? "s" : ""} enregistré${clients.length > 1 ? "s" : ""}`}
        action={
          <button onClick={() => setEditing({ status: "actif" })} className={btnGold}>
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        }
      />

      <div className="card-elegant p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email, ville…"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} sm:w-56`}>
          <option value="">Tous les statuts</option>
          {Object.entries(clientStatusMeta).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="card-elegant h-64 animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun client" hint="Créez votre premier client pour commencer." />
      ) : (
        <div className="card-elegant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nom</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Ville</th>
                  <th className="text-left px-4 py-3 font-medium">Statut</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const meta = clientStatusMeta[c.status] || clientStatusMeta.actif;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to="/admin/clients/$id" params={{ id: c.id }} className="font-medium hover:underline">{c.full_name}</Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        <div>{c.phone || "—"}</div>
                        {c.email && <div className="text-xs">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.city || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge label={meta.label} tone={meta.tone} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => codeMutation.mutate({ id: c.id })} title="Générer code" className="p-2 rounded-md hover:bg-accent">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <Link to="/admin/clients/$id" params={{ id: c.id }} className="p-2 rounded-md hover:bg-accent" title="Voir">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setEditing(c)} title="Modifier" className="p-2 rounded-md hover:bg-accent">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer ${c.full_name} ?`)) deleteMutation.mutate(c.id);
                            }}
                            title="Supprimer"
                            className="p-2 rounded-md hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[color:var(--destructive)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Modifier le client" : "Nouveau client"} size="lg">
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editing);
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom complet *">
                <input className={inputCls} value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} required />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={editing.status || "actif"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {Object.entries(clientStatusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Téléphone">
                <input className={inputCls} value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="WhatsApp">
                <input className={inputCls} value={editing.whatsapp || ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </Field>
              <Field label="Ville">
                <input className={inputCls} value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={`${inputCls} min-h-[80px]`} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Annuler</button>
              <button type="submit" className={btnPrimary} disabled={saveMutation.isPending}>Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!generatedCode} onClose={() => setGeneratedCode(null)} title="Code d'accès généré">
        {generatedCode && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Code privé pour <strong className="text-foreground">{generatedCode.clientName}</strong>. Notez-le maintenant, il ne sera plus affiché.
            </p>
            <div className="p-5 rounded-xl bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] text-center">
              <p className="font-mono text-2xl font-semibold tracking-widest">{generatedCode.code}</p>
            </div>
            <div className="flex gap-2 justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode.code);
                  toast.success("Code copié");
                }}
                className={btnGhost}
              >
                <Copy className="w-4 h-4" /> Copier
              </button>
              <button
                onClick={() => {
                  const c = clients.find((x) => x.full_name === generatedCode.clientName);
                  const tel = (c?.whatsapp || c?.phone || "").replace(/\D/g, "");
                  const msg = encodeURIComponent(
                    `Bonjour ${generatedCode.clientName}, votre espace client LB Access Cloud est prêt. Code d'accès : ${generatedCode.code}. Connectez-vous sur ${window.location.origin} pour récupérer vos informations. Merci.`,
                  );
                  if (tel) window.open(`https://wa.me/${tel}?text=${msg}`, "_blank");
                }}
                className={btnPrimary}
              >
                Envoyer via WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
