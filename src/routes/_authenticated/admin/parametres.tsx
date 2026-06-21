import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Field, inputCls, btnPrimary, btnGold } from "@/components/admin-ui";
import { seedDemoData } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/parametres")({
  component: SettingsPage,
});

function SettingsPage() {
  const seed = useServerFn(seedDemoData);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [demoCodes, setDemoCodes] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        const { data: prof } = await supabase.from("admin_profiles").select("full_name").eq("id", data.user.id).maybeSingle();
        setFullName(prof?.full_name || "");
      }
    })();
  }, []);

  const { data: role } = useQuery({
    queryKey: ["my-role", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle()).data,
  });

  const updateProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("admin_profiles").update({ full_name: fullName }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour");
  };

  const seedMut = useMutation({
    mutationFn: async () => seed(),
    onSuccess: (res) => {
      toast.success("Données de démo chargées");
      setDemoCodes(res.codes);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Compte, sécurité et données de démonstration" />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card-elegant p-5">
          <h2 className="font-display text-lg font-semibold mb-1">Mon compte</h2>
          <p className="text-xs text-muted-foreground mb-4">Rôle : <strong className="text-foreground capitalize">{role?.role || "—"}</strong></p>
          <div className="space-y-4">
            <Field label="Email"><input className={inputCls} value={user?.email || ""} disabled /></Field>
            <Field label="Nom complet"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
            <button onClick={updateProfile} className={btnPrimary}>Enregistrer</button>
          </div>
        </div>

        <div className="card-elegant p-5">
          <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[color:var(--success)]" /> Sécurité</h2>
          <ul className="text-sm space-y-2 text-muted-foreground mt-3">
            <li>✓ Authentification email/mot de passe via Lovable Cloud</li>
            <li>✓ Mots de passe des comptes chiffrés (AES-256-GCM)</li>
            <li>✓ Codes d'accès stockés hashés (SHA-256)</li>
            <li>✓ Row Level Security activée sur toutes les tables</li>
            <li>✓ Audit log de toutes les actions sensibles</li>
            <li>✓ Vérification optionnelle par contact (email/téléphone)</li>
          </ul>
        </div>

        {role?.role === "admin" && (
          <div className="card-elegant p-5 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[color:var(--gold)]" /> Données de démonstration
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Charge 5 clients fictifs, 3 comptes (2 Netflix, 1 Prime), des profils assignés et quelques paiements.
              Les codes générés seront affichés ici une seule fois.
            </p>
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending} className={btnGold}>
              {seedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Charger les données de démo
            </button>

            {demoCodes && (
              <div className="mt-5 grid sm:grid-cols-2 gap-2">
                {Object.entries(demoCodes).map(([name, code]) => (
                  <div key={name} className="p-3 rounded-lg bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] border border-[color-mix(in_oklab,var(--gold)_40%,transparent)]">
                    <p className="text-xs text-muted-foreground">{name}</p>
                    <p className="font-mono font-semibold">{code}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
