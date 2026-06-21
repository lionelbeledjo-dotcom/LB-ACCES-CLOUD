import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, KeyRound, Lock, LifeBuoy, Eye } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { verifyAccessCode } from "@/lib/access.functions";

export const Route = createFileRoute("/client/access")({
  head: () => ({
    meta: [
      { title: "LB Access Cloud — Accès client sécurisé" },
      { name: "description", content: "Entrez votre code d'accès privé pour consulter vos abonnements et profils." },
    ],
  }),
  component: ClientAccessPage,
});

function ClientAccessPage() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyAccessCode);
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");
  const [showDemo, setShowDemo] = useState(false);

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

  if (showDemo) {
    return <DemoPortal onBack={() => setShowDemo(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <BrandLogo />
        <a
          href="/admin/login"
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

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDemo(true)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                <Eye className="w-3 h-3" />
                Voir un aperçu démo
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              Vos informations sont chiffrées et chaque accès est enregistré dans le journal d'audit.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} LB Access Cloud &middot; Plateforme de gestion d'accès premium
      </footer>
    </div>
  );
}

// ========== DEMO PORTAL ==========
const DEMO_CLIENT = {
  full_name: "Client Démo",
  phone: "+237 600 000 000",
  status: "actif",
};

const DEMO_PROFILES = [
  {
    id: "demo-netflix",
    service: "Netflix",
    account: "Netflix Famille 01",
    profile_name: "Profil 3",
    profile_number: 3,
    pin: "1234",
    email: "lb.netflix.demo@exemple.com",
    password: "D3m0P@ss!Netfl1x",
    end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    instructions: "Connectez-vous sur netflix.com avec les identifiants fournis. Sélectionnez le profil indiqué.",
  },
  {
    id: "demo-prime",
    service: "Prime Video",
    account: "Prime Video FR",
    profile_name: "Accès 1",
    profile_number: 1,
    pin: null,
    email: "lb.prime.demo@exemple.com",
    password: "D3m0P@ss!Pr1me",
    end_date: new Date(Date.now() + 25 * 86400000).toISOString(),
    instructions: "Connectez-vous sur primevideo.com avec les identifiants fournis.",
  },
  {
    id: "demo-canva",
    service: "Canva Pro",
    account: "Canva Pro Team",
    profile_name: "Équipe 2",
    profile_number: 2,
    pin: null,
    email: "lb.canva.demo@exemple.com",
    password: "D3m0P@ss!C4nva",
    end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
    instructions: "Connectez-vous sur canva.com avec les identifiants fournis. Accès Pro complet.",
  },
  {
    id: "demo-capcut",
    service: "CapCut Pro",
    account: "CapCut Pro",
    profile_name: "Accès 1",
    profile_number: 1,
    pin: null,
    email: "lb.capcut.demo@exemple.com",
    password: "D3m0P@ss!C4pCut",
    end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
    instructions: "Connectez-vous sur capcut.com ou dans l'app CapCut avec les identifiants fournis.",
  },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function DemoPortal({ onBack }: { onBack: () => void }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-6 py-5 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color-mix(in_oklab,var(--gold)_20%,transparent)] text-[color:var(--gold-foreground)] font-medium">
            Mode Démo
          </span>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">Quitter</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* En-tête client */}
        <section className="card-elegant p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 blur-3xl" style={{ background: "var(--gold)" }} />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Bienvenue</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">{DEMO_CLIENT.full_name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-current" /> Actif
              </span>
              <span className="text-xs text-muted-foreground">{DEMO_CLIENT.phone}</span>
              <span className="text-xs text-muted-foreground">Code : LB-DEMO-001</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">Voici vos abonnements et accès assignés.</p>
          </div>
        </section>

        {/* Section Mes accès */}
        <div className="flex items-center gap-2 mt-2">
          <h2 className="font-display text-lg font-semibold">Mes accès</h2>
          <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{DEMO_PROFILES.length} services</span>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {DEMO_PROFILES.map((p) => {
            const isRevealed = revealed[p.id] || false;
            const days = daysLeft(p.end_date);
            const expiringSoon = days <= 7;

            return (
              <div key={p.id} className="card-elegant p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[color:var(--primary)] flex items-center justify-center">
                      <ServiceIcon service={p.service} />
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-semibold leading-tight">{p.service}</h3>
                      <p className="text-xs text-muted-foreground">{p.account}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${expiringSoon ? "bg-[color-mix(in_oklab,var(--warning)_15%,transparent)] text-[color:var(--warning)]" : "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)]"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {expiringSoon ? "Expire bientôt" : "Actif"}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-2.5 text-sm">
                  <InfoRow label="Profil / Place" value={`${p.profile_name} · n° ${p.profile_number}`} />
                  {p.pin && <InfoRow label="PIN du profil" value={p.pin} mono />}
                  <InfoRow label="Email de connexion" value={p.email} copyable />

                  {/* Mot de passe */}
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-accent/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0">Mot de passe</span>
                      <span className="font-mono text-sm truncate">
                        {isRevealed ? p.password : "••••••••••"}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isRevealed && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(p.password); toast.success("Mot de passe copié"); }}
                          className="p-1.5 rounded-md hover:bg-background"
                          title="Copier"
                        >
                          <CopyIcon />
                        </button>
                      )}
                      <button
                        onClick={() => setRevealed((r) => ({ ...r, [p.id]: !isRevealed }))}
                        className="px-2 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:opacity-95 inline-flex items-center gap-1"
                      >
                        {isRevealed ? "Masquer" : "Afficher"}
                      </button>
                    </div>
                  </div>

                  <InfoRow label="Expiration" value={`${fmtDate(p.end_date)} (${days}j restants)`} />
                </dl>

                {p.instructions && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                    <strong className="text-foreground">Instructions :</strong> {p.instructions}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section Renouvellements */}
        <section className="card-elegant p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Mes renouvellements</h2>
          <div className="space-y-3">
            {DEMO_PROFILES.filter((p) => daysLeft(p.end_date) <= 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                <div>
                  <p className="text-sm font-medium">{p.service}</p>
                  <p className="text-xs text-muted-foreground">Expire le {fmtDate(p.end_date)} &middot; {daysLeft(p.end_date)}j restants</p>
                </div>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-[color-mix(in_oklab,var(--gold)_20%,transparent)] text-[color:var(--gold-foreground)] font-medium hover:opacity-90">
                  Demander le renouvellement
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section Sécurité */}
        <section className="card-elegant p-6">
          <h2 className="font-display text-lg font-semibold mb-3">Sécurité</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[color:var(--primary)]" /> Votre code est personnel et confidentiel.</li>
            <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-[color:var(--primary)]" /> Ne partagez pas vos accès avec d'autres personnes.</li>
            <li className="flex items-center gap-2"><Eye className="w-4 h-4 text-[color:var(--primary)]" /> Chaque consultation d'identifiants est enregistrée.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function InfoRow({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-accent/40">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className={`truncate ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
      {copyable && (
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copié`); }} className="p-1.5 rounded-md hover:bg-background shrink-0" title="Copier">
          <CopyIcon />
        </button>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ServiceIcon({ service }: { service: string }) {
  const icons: Record<string, string> = {
    "Netflix": "N",
    "Prime Video": "P",
    "Canva Pro": "C",
    "CapCut Pro": "CC",
  };
  return <span className="font-display font-bold text-lg">{icons[service] || service[0]}</span>;
}
