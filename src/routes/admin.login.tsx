import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/admin/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: AdminLoginPage,
});

type Mode = "signin" | "signup" | "reset";

function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/admin/login",
        });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setResetSent(true);
        toast.success("Email de réinitialisation envoyé");
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/admin/dashboard",
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          navigate({ to: "/admin/dashboard" });
        } else {
          setMode("signin");
        }
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email ou mot de passe incorrect.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Veuillez confirmer votre email avant de vous connecter.");
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-[color:var(--cinema-purple)] opacity-[0.06] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[color:var(--gold)] opacity-[0.05] blur-[80px]" />
      </div>

      <header className="relative px-6 py-5 flex items-center justify-between">
        <BrandLogo />
        <a
          href="/client/access"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-foreground/20"
        >
          <ArrowLeft className="w-3 h-3" />
          Portail client
        </a>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="card-premium p-7 sm:p-9 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[color:var(--gold)] opacity-[0.05] blur-[60px]" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] border border-[color-mix(in_oklab,var(--gold)_30%,transparent)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--gold)]" />
                  <span className="text-xs font-medium text-[color:var(--gold)]">Administration</span>
                </span>
              </div>

              <h1 className="font-display text-2xl font-bold">
                {mode === "signup" ? "Créer un compte admin" : mode === "reset" ? "Réinitialiser le mot de passe" : "Connexion administrateur"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === "signup"
                  ? "Créez votre compte pour accéder à la console de gestion."
                  : mode === "reset"
                    ? "Entrez votre email pour recevoir un lien de réinitialisation."
                    : "Accédez à la console de gestion LB Access Cloud."}
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] border border-[color-mix(in_oklab,var(--destructive)_30%,transparent)]">
                  <p className="text-sm text-[color:var(--destructive)] font-medium">{error}</p>
                </div>
              )}

              {resetSent ? (
                <div className="mt-6 p-4 rounded-lg bg-[color-mix(in_oklab,var(--success)_10%,transparent)] border border-[color-mix(in_oklab,var(--success)_30%,transparent)]">
                  <p className="text-sm text-[color:var(--success)] font-medium">
                    Un email de réinitialisation a été envoyé à {email}. Vérifiez votre boîte de réception.
                  </p>
                  <button
                    onClick={() => { setResetSent(false); setMode("signin"); }}
                    className="mt-3 text-xs text-[color:var(--gold)] font-medium hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <form className="mt-6 space-y-4" onSubmit={submit}>
                  {mode === "signup" && (
                    <div>
                      <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="mt-1.5 w-full px-4 py-3 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40 focus:border-[color:var(--gold)]/60 transition-all"
                        placeholder="Votre nom"
                      />
                    </div>
                  )}

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
                      className="mt-1.5 w-full px-4 py-3 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40 focus:border-[color:var(--gold)]/60 transition-all"
                      placeholder="admin@example.com"
                    />
                  </div>

                  {mode !== "reset" && (
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
                        className="mt-1.5 w-full px-4 py-3 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40 focus:border-[color:var(--gold)]/60 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl btn-gold font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === "signup" ? "Créer mon compte" : mode === "reset" ? "Envoyer le lien" : "Se connecter"}
                  </button>
                </form>
              )}

              {!resetSent && (
                <div className="mt-5 space-y-2 text-center">
                  {mode === "signin" && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Pas encore de compte ?{" "}
                        <button onClick={() => { setMode("signup"); setError(""); }} className="text-[color:var(--gold)] font-medium hover:underline">
                          Créer un compte
                        </button>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <button onClick={() => { setMode("reset"); setError(""); }} className="text-[color:var(--gold)] font-medium hover:underline">
                          Mot de passe oublié ?
                        </button>
                      </p>
                    </>
                  )}
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Déjà un compte ?{" "}
                      <button onClick={() => { setMode("signin"); setError(""); }} className="text-[color:var(--gold)] font-medium hover:underline">
                        Se connecter
                      </button>
                    </p>
                  )}
                  {mode === "reset" && (
                    <p className="text-xs text-muted-foreground">
                      <button onClick={() => { setMode("signin"); setError(""); }} className="text-[color:var(--gold)] font-medium hover:underline">
                        Retour à la connexion
                      </button>
                    </p>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground mt-5 text-center">
                Accès réservé aux administrateurs autorisés. Chaque connexion est enregistrée.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
