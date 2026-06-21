import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Tv, Palette, Clapperboard, Globe, Monitor, Film } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Modal, Field, inputCls, btnPrimary, btnGhost, btnGold } from "@/components/admin-ui";
import { saveService, deleteService } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/services")({
  component: ServicesPage,
});

type Service = { id: string; name: string; category: string | null; description: string | null; default_slots: number; icon: string | null; instructions_template: string | null; is_active: boolean };

function getServiceVisual(name: string) {
  const n = name.toLowerCase();
  if (n.includes("netflix")) return { gradient: "from-red-600 to-red-900", icon: Monitor, glow: "glow-red" };
  if (n.includes("prime")) return { gradient: "from-[color:var(--cinema-blue)] to-cyan-700", icon: Film, glow: "glow-blue" };
  if (n.includes("canva")) return { gradient: "from-[color:var(--cinema-purple)] to-violet-800", icon: Palette, glow: "glow-purple" };
  if (n.includes("capcut")) return { gradient: "from-teal-500 to-[color:var(--cinema-blue)]", icon: Clapperboard, glow: "glow-blue" };
  if (n.includes("stream") || n.includes("tv")) return { gradient: "from-[color:var(--cinema-red)] to-rose-900", icon: Tv, glow: "glow-red" };
  return { gradient: "from-[color:var(--gold)] to-amber-800", icon: Globe, glow: "glow-gold" };
}

function getCategoryLabel(cat: string | null) {
  if (!cat) return "Autre";
  const c = cat.toLowerCase();
  if (c.includes("stream")) return "Streaming";
  if (c.includes("design")) return "Design";
  if (c.includes("vid")) return "Vidéo";
  return cat;
}

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
      return data as unknown as Service[];
    },
  });

  const saveMut = useMutation({
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((s) => {
          const visual = getServiceVisual(s.name);
          const Icon = visual.icon;
          return (
            <div key={s.id} className={`card-service p-0 overflow-hidden ${!s.is_active ? "opacity-50 grayscale" : ""}`}>
              {/* Service header */}
              <div className={`relative px-5 py-4 bg-gradient-to-r ${visual.gradient}`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg font-bold text-white truncate">{s.name}</h2>
                    <p className="text-xs text-white/70">{getCategoryLabel(s.category)}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
                    <p className="text-lg font-bold font-display">{s.default_slots}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Places/défaut</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)]" : "bg-muted text-muted-foreground"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {s.is_active ? "Actif" : "Inactif"}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Statut</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <label className="relative inline-flex items-center cursor-pointer" title={s.is_active ? "Désactiver" : "Activer"}>
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      onChange={() => saveMut.mutate({ id: s.id, name: s.name, default_slots: s.default_slots, is_active: !s.is_active })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-[color:var(--primary)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(s)} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Modifier">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) delMut.mutate(s.id); }} className="p-2 rounded-lg text-[color:var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Modifier le service" : "Nouveau service"} size="lg">
        {editing && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(editing); }}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom *"><input className={inputCls} value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
              <Field label="Catégorie"><input className={inputCls} value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Streaming, Design, Vidéo..." /></Field>
              <Field label="Slots par défaut *"><input type="number" min={1} className={inputCls} value={editing.default_slots ?? 5} onChange={(e) => setEditing({ ...editing, default_slots: parseInt(e.target.value || "5") })} required /></Field>
              <Field label="Icône (clé Lucide)"><input className={inputCls} value={editing.icon || ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="tv, palette, film..." /></Field>
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
