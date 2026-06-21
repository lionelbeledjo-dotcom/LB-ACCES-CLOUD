import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { ShieldCheck, Loader2 } from "lucide-react";
import { checkHasAnyUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/admin/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkUsers = useServerFn(checkHasAnyUser);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstUser, setFirstUser] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await checkUsers();
        if (!res.hasUsers) {
          setFirstUser(true);
          setMode("signup");
        }
      } catch {
        // Ignore — fallback to sign-in
      }
    })();
  }, [checkUsers]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/admin/dashboard" },
        });
        if (error) throw error;
        toast.success(firstUser ? "Compte administrateur créé !" : "Compte créé !");
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) navigate({ to: "/admin/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connexion réussie");
        navigate({ to: "/admin/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <BrandLogo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card-elegant w-full max-w-md p-7 shadow-elegant">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs">
            <ShieldCheck className="w-3 h-3" /> Espace administrateur
          </div>
          <h1 className="font-display text-2xl font-semibold mt-3">
            {mode === "signup" ? (firstUser ? "Créer le compte admin" : "Créer un compte") : "Connexion"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {firstUser
              ? "Le premier compte créé devient automatiquement administrateur."
              : "Accédez à la console de gestion LB Access Cloud."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Nom complet" value={fullName} onChange={setFullName} type="text" required />
            )}
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <Field label="Mot de passe" value={password} onChange={setPassword} type="password" required minLength={8} />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signup" ? "Créer le compte" : "Se connecter"}
            </button>
          </form>

          {!firstUser && (
            <p className="text-xs text-center text-muted-foreground mt-5">
              {mode === "signin" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                {mode === "signin" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
      />
    </div>
  );
}
