import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/admin/dashboard" });
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email ou mot de passe incorrect.");
        } else {
          setError(authError.message);
        }
        return;
      }
      toast.success("Connexion réussie");
      navigate({ to: "/admin/dashboard" });
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-[color-mix(in_oklab,var(--gold)_5%,var(--background))]">
      <header className="px-6 py-5 flex items-center justify-between">
        <BrandLogo />
        <a
          href="/client/access"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3 h-3" />
          Portail client
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="card-elegant p-7 sm:p-9 shadow-elegant">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] border border-[color-mix(in_oklab,var(--gold)_35%,transparent)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--gold-foreground)]" />
                <span className="text-xs font-medium text-[color:var(--gold-foreground)]">Administration</span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-semibold">Connexion administrateur</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Accédez à la console de gestion LB Access Cloud.
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] border border-[color-mix(in_oklab,var(--destructive)_30%,transparent)]">
                <p className="text-sm text-[color:var(--destructive)] font-medium">{error}</p>
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1.5 w-full px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant hover:opacity-95 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Se connecter
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground mt-6 text-center">
              Accès réservé aux administrateurs autorisés. Chaque connexion est enregistrée.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
