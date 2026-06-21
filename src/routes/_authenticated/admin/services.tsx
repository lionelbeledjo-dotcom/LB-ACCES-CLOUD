import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost, btnGold } from "@/components/admin-ui";
import { saveService, deleteService } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/services")({
  component: ServicesPage,
});

type Service = { id: string; name: string; category: string | null; description: string | null; default_slots: number; icon: string | null; instructions_template: string | null };

function ServicesPage() {
  const qc = useQueryClient();
  const save = useServerFn(saveService);
  const del = useServerFn(deleteService);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const saveMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (p: Partial<Service>) => save({ data: p as any }),
    onSuccess: () => {
      toast.success("Service enregistré");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Service supprimé");
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Configurez les services numériques que vous gérez"
        action={<button onClick={() => setEditing({ default_slots: 5 })} className={btnGold}><Plus className="w-4 h-4" /> Nouveau service</button>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="card-elegant p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">{s.name}</h2>
                <p className="text-xs text-muted-foreground">{s.category || "—"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(s)} className="p-2 rounded-md hover:bg-accent"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) delMut.mutate(s.id); }} className="p-2 rounded-md text-[color:var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)]"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {s.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{s.description}</p>}
            <div className="text-xs text-muted-foreground mt-3">Slots par défaut : <strong className="text-foreground">{s.default_slots}</strong></div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Modifier le service" : "Nouveau service"} size="lg">
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom *"><input className={inputCls} value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
              <Field label="Catégorie"><input className={inputCls} value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
              <Field label="Slots par défaut *"><input type="number" min={1} className={inputCls} value={editing.default_slots ?? 5} onChange={(e) => setEditing({ ...editing, default_slots: parseInt(e.target.value || "5") })} required /></Field>
              <Field label="Icône (clé Lucide)"><input className={inputCls} value={editing.icon || ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="tv" /></Field>
            </div>
            <Field label="Description"><textarea className={`${inputCls} min-h-[80px]`} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label="Instructions d'utilisation (visible par le client)">
              <textarea className={`${inputCls} min-h-[100px]`} value={editing.instructions_template || ""} onChange={(e) => setEditing({ ...editing, instructions_template: e.target.value })} />
            </Field>
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
