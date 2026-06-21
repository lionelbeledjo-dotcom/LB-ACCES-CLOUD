import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, KeyRound, Lock, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { verifyAccessCode } from "@/lib/access.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LB Access Cloud — Accès client sécurisé" },
      { name: "description", content: "Entrez votre code d'accès privé pour consulter vos abonnements et profils." },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyAccessCode);
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");

  const mutation = useMutation({
    mutationFn: async () => verify({ data: { code, contact: contact || null } }),
    onSuccess: (res) => {
      if (res.ok) {
        navigate({ to: "/espace/$token", params: { token: res.token } });
      } else {
        toast.error(res.error);
      }
    },
    onError: () => toast.error("Une erreur est survenue. Réessayez."),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <BrandLogo />
        <a
          href="/auth"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border"
        >
          Espace administrateur
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
          <div className="hidden md:block space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color-mix(in_oklab,var(--gold)_20%,transparent)] border border-[color-mix(in_oklab,var(--gold)_45%,transparent)]">
              <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--gold-foreground)]" />
              <span className="text-xs font-medium text-[color:var(--gold-foreground)]">Accès chiffré et tracé</span>
            </div>
            <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight">
              Votre espace <span className="text-[color:var(--primary)]">privé</span><br />
              géré avec <span className="italic text-[color:var(--gold)]">élégance</span>.
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              LB Access Cloud vous donne accès à vos abonnements et profils en toute sécurité, depuis un seul code privé.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { icon: KeyRound, text: "Un code privé unique, à usage personnel" },
                { icon: Lock, text: "Informations chiffrées, jamais partagées" },
                { icon: LifeBuoy, text: "Support WhatsApp à portée de main" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                    <f.icon className="w-4 h-4" />
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-elegant p-7 md:p-9 shadow-elegant">
            <div className="md:hidden mb-6">
              <h1 className="font-display text-3xl font-semibold">Bienvenue</h1>
              <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre espace privé.</p>
            </div>
            <h2 className="font-display text-2xl font-semibold hidden md:block">Accès à votre espace</h2>
            <p className="text-sm text-muted-foreground mt-1 hidden md:block">
              Entrez le code privé fourni par votre conseiller.
            </p>

            <form
              className="mt-6 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!code.trim()) return;
                mutation.mutate();
              }}
            >
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  Entrez votre code d'accès
                </label>
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="LB-XXXX-XX"
                  className="mt-2 w-full px-4 py-3 rounded-xl bg-background border border-input text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  maxLength={32}
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                  Vérification (optionnel)
                </label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email ou 4 derniers chiffres du téléphone"
                  className="mt-2 w-full px-4 py-3 rounded-xl bg-background border border-input focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  maxLength={120}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Renforce la sécurité de votre accès.
                </p>
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-elegant hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {mutation.isPending ? "Vérification…" : "Accéder à mon espace"}
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground mt-6 text-center">
              Vos informations sont chiffrées et chaque accès est enregistré dans le journal d'audit.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LB Access Cloud · Plateforme de gestion d'accès premium
      </footer>
    </div>
  );
}
