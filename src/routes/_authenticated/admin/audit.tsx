import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, inputCls } from "@/components/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

const actionLabels: Record<string, string> = {
  client_login_success: "Connexion client",
  client_login_failed: "Tentative échouée",
  client_credential_revealed: "Mot de passe consulté (client)",
  admin_credential_revealed: "Mot de passe consulté (admin)",
  client_created: "Client créé",
  client_updated: "Client modifié",
  client_deleted: "Client supprimé",
  access_code_generated: "Code généré",
  service_account_created: "Compte créé",
  service_account_updated: "Compte modifié",
  profile_updated: "Profil modifié",
  profile_released: "Profil libéré",
  payment_recorded: "Paiement enregistré",
  client_support_request: "Demande support",
  demo_seed_loaded: "Données démo chargées",
  service_created: "Service créé",
};

function AuditPage() {
  const [search, setSearch] = useState("");
  const { data: logs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await supabase
      .from("audit_logs")
      .select("*, client:clients(full_name)")
      .order("created_at", { ascending: false }).limit(200)).data || [],
  });

  const filtered = logs.filter((l) => !search || JSON.stringify(l).toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Journal d'audit" subtitle="Toutes les actions sensibles sont tracées" />

      <div className="card-elegant p-3 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer…" className={inputCls} />
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Client</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => {
                const c = l.client as { full_name: string } | null;
                return (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-md bg-accent text-accent-foreground">{actionLabels[l.action] || l.action}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs font-mono">{l.user_id ? l.user_id.slice(0, 8) : "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{c?.full_name || "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono truncate max-w-[280px]">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Aucun évènement.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
