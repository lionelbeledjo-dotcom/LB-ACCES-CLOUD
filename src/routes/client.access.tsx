import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck, KeyRound, Lock, LifeBuoy, Eye, EyeOff, Copy,
  Tv, Palette, Clapperboard, Globe, Film, Smartphone,
  Fingerprint, RefreshCw, MessageCircle, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { verifyAccessCode } from "@/lib/access.functions";

export const Route = createFileRoute("/client/access")({
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[color:var(--cinema-purple)] opacity-[0.07] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[color:var(--cinema-blue)] opacity-[0.07] blur-[100px]" />
        <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-[color:var(--cinema-red)] opacity-[0.05] blur-[80px]" />
        <div className="absolute bottom-1/4 left-0 w-48 h-48 rounded-full bg-[color:var(--gold)] opacity-[0.04] blur-[60px]" />
      </div>

      {/* Header */}
      <header className="relative px-6 py-5 flex items-center justify-between">
        <BrandLogo />
        <a
          href="/admin/login"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm hover:border-[color:var(--gold)]/40"
        >
          Espace administrateur
        </a>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text + visual */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] border border-[color-mix(in_oklab,var(--gold)_30%,transparent)]">
              <ShieldCheck className="w-4 h-4 text-[color:var(--gold)]" />
              <span className="text-xs font-medium text-[color:var(--gold)]">Plateforme sécurisée & chiffrée</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
              Vos accès digitaux réunis dans un{" "}
              <span className="text-gradient-gold">espace privé</span>.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Streaming, design, montage vidéo et outils en ligne : récupérez vos accès en toute sécurité avec votre code personnel.
            </p>

            {/* Visual cards floating */}
            <div className="hidden lg:flex items-center gap-4 mt-8">
              <div className="card-service p-4 flex items-center gap-3 glow-red">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[color:var(--cinema-red)] to-[color:var(--cinema-red)]/60 flex items-center justify-center">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Streaming</p>
                  <p className="text-xs text-muted-foreground">Films & Séries</p>
                </div>
              </div>
              <div className="card-service p-4 flex items-center gap-3 glow-purple">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[color:var(--cinema-purple)] to-[color:var(--cinema-purple)]/60 flex items-center justify-center">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Design</p>
                  <p className="text-xs text-muted-foreground">Création pro</p>
                </div>
              </div>
              <div className="card-service p-4 flex items-center gap-3 glow-blue">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[color:var(--cinema-blue)] to-[color:var(--cinema-blue)]/60 flex items-center justify-center">
                  <Clapperboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Montage</p>
                  <p className="text-xs text-muted-foreground">Vidéo pro</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Access form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="card-premium p-7 sm:p-9 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[color:var(--gold)] opacity-[0.06] blur-[60px]" />

              <div className="relative">
                <h2 className="font-display text-2xl font-bold">Accédez à votre espace</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Entrez le code privé fourni par votre conseiller.
                </p>

                <form
                  className="mt-7 space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!code.trim()) return;
                    mutation.mutate();
                  }}
                >
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Code d'accès
                    </label>
                    <input
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="LB-XXXX-XX"
                      className="mt-2 w-full px-4 py-4 rounded-xl bg-background/80 border border-input text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/50 focus:border-[color:var(--gold)]/60 transition-all"
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
                      className="mt-2 w-full px-4 py-3 rounded-xl bg-background/80 border border-input focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/50 focus:border-[color:var(--gold)]/60 transition-all"
                      maxLength={120}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full py-4 rounded-xl btn-gold text-base font-semibold disabled:opacity-50 transition-all hover:scale-[1.01]"
                  >
                    {mutation.isPending ? "Vérification…" : "Accéder à mon espace"}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <button
                    onClick={() => setShowDemo(true)}
                    className="text-sm text-muted-foreground hover:text-[color:var(--gold)] transition-colors inline-flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir un aperçu démo
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground mt-4 text-center leading-relaxed">
                  Vos informations sont chiffrées. Chaque accès est enregistré dans le journal d'audit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="relative px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Services disponibles</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Gérez vos accès à des dizaines de services digitaux premium depuis un seul espace sécurisé.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ServiceCard
              icon={<Tv className="w-7 h-7" />}
              name="Streaming Films & Séries"
              description="Accès sécurisé par code privé"
              gradient="from-[color:var(--cinema-red)] to-[color:var(--cinema-red)]/50"
              glow="glow-red"
            />
            <ServiceCard
              icon={<Film className="w-7 h-7" />}
              name="Prime Video"
              description="Accès sécurisé par code privé"
              gradient="from-[color:var(--cinema-blue)] to-cyan-600/50"
              glow="glow-blue"
            />
            <ServiceCard
              icon={<Monitor className="w-7 h-7" />}
              name="Netflix"
              description="Accès sécurisé par code privé"
              gradient="from-red-600 to-red-900/50"
              glow="glow-red"
            />
            <ServiceCard
              icon={<Palette className="w-7 h-7" />}
              name="Canva Pro"
              description="Accès sécurisé par code privé"
              gradient="from-[color:var(--cinema-purple)] to-violet-700/50"
              glow="glow-purple"
            />
            <ServiceCard
              icon={<Clapperboard className="w-7 h-7" />}
              name="CapCut Pro"
              description="Accès sécurisé par code privé"
              gradient="from-teal-500 to-[color:var(--cinema-blue)]/50"
              glow="glow-blue"
            />
            <ServiceCard
              icon={<Globe className="w-7 h-7" />}
              name="Autres services digitaux"
              description="Accès sécurisé par code privé"
              gradient="from-[color:var(--gold)] to-amber-700/50"
              glow="glow-gold"
            />
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="relative px-4 sm:px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Pourquoi utiliser <span className="text-gradient-gold">LB Access Cloud</span> ?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FeatureCard icon={<Fingerprint className="w-6 h-6" />} title="Code unique personnel" desc="Un code privé généré pour vous, impossible à deviner." />
            <FeatureCard icon={<Lock className="w-6 h-6" />} title="Identifiants protégés" desc="Masqués par défaut. Affichage uniquement après vérification." />
            <FeatureCard icon={<RefreshCw className="w-6 h-6" />} title="Renouvellement suivi" desc="Alertes avant expiration. Continuité de service garantie." />
            <FeatureCard icon={<MessageCircle className="w-6 h-6" />} title="Support WhatsApp rapide" desc="Assistance directe via WhatsApp en cas de besoin." />
          </div>

          {/* Trust section */}
          <div className="mt-12 card-elegant p-6 sm:p-8 text-center max-w-3xl mx-auto border-[color-mix(in_oklab,var(--gold)_20%,transparent)]">
            <ShieldCheck className="w-8 h-8 text-[color:var(--gold)] mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vos accès ne sont <strong className="text-foreground">jamais envoyés directement dans WhatsApp</strong>. Vous recevez uniquement un lien sécurisé et un code personnel. Les identifiants restent protégés dans votre espace privé.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-8 mt-auto border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; 2024 LB Access Cloud &middot; Plateforme de gestion d'accès premium</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Sécurisé & chiffré</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>Audit en temps réel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ServiceCard({ icon, name, description, gradient, glow }: { icon: React.ReactNode; name: string; description: string; gradient: string; glow: string }) {
  return (
    <div className={`card-service p-6 relative overflow-hidden group`}>
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-xl group-hover:opacity-30 transition-opacity`} />
      <div className="relative flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 ${glow}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold">{name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Disponible
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card-elegant p-6 text-center group hover:border-[color-mix(in_oklab,var(--gold)_30%,transparent)] transition-colors">
      <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] text-[color:var(--gold)] flex items-center justify-center mx-auto mb-4 group-hover:glow-gold transition-all">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

// ========== DEMO PORTAL ==========
function getDemoProfiles() {
  return [
    {
      id: "demo-netflix",
      service: "Netflix",
      account: "Netflix Famille 01",
      profile_name: "Profil 3",
      profile_number: 3,
      pin: "1234",
      email: "lb.netflix.demo@exemple.com",
      password: "D3m0P@ss!Netfl1x",
      daysLeft: 30,
      instructions: "Connectez-vous sur netflix.com avec les identifiants fournis. Sélectionnez le profil indiqué.",
      gradient: "from-red-600 to-red-900",
      icon: <Monitor className="w-6 h-6" />,
      glow: "glow-red",
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
      daysLeft: 25,
      instructions: "Connectez-vous sur primevideo.com avec les identifiants fournis.",
      gradient: "from-[color:var(--cinema-blue)] to-cyan-700",
      icon: <Film className="w-6 h-6" />,
      glow: "glow-blue",
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
      daysLeft: 20,
      instructions: "Connectez-vous sur canva.com avec les identifiants fournis. Accès Pro complet.",
      gradient: "from-[color:var(--cinema-purple)] to-violet-800",
      icon: <Palette className="w-6 h-6" />,
      glow: "glow-purple",
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
      daysLeft: 15,
      instructions: "Connectez-vous sur capcut.com ou dans l'app CapCut avec les identifiants fournis.",
      gradient: "from-teal-500 to-[color:var(--cinema-blue)]",
      icon: <Clapperboard className="w-6 h-6" />,
      glow: "glow-blue",
    },
  ];
}

function DemoPortal({ onBack }: { onBack: () => void }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const profiles = getDemoProfiles();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-[color:var(--cinema-red)] opacity-[0.05] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-[color:var(--cinema-blue)] opacity-[0.05] blur-[100px]" />
      </div>

      <header className="relative px-4 sm:px-6 py-5 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur-md">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[color:var(--gold)] font-semibold border border-[color-mix(in_oklab,var(--gold)_30%,transparent)]">
            Mode Démo
          </span>
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-foreground/20">
            Quitter
          </button>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome header */}
        <section className="card-premium p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[color:var(--gold)] opacity-[0.06] blur-[80px]" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[color:var(--cinema-blue)] opacity-[0.08] blur-[60px]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-[color:var(--gold)] font-medium">Bienvenue</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">Client Démo</h1>
            <p className="text-muted-foreground mt-2 text-sm">Votre espace privé est actif jusqu'au <strong className="text-foreground">15 juillet 2026</strong></p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" /> Actif
              </span>
              <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border">+237 600 000 000</span>
              <span className="text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border font-mono">LB-DEMO-001</span>
            </div>
          </div>
        </section>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-elegant p-4 text-center">
            <div className="text-2xl font-bold font-display text-[color:var(--success)]">4</div>
            <p className="text-xs text-muted-foreground mt-1">Accès actifs</p>
          </div>
          <div className="card-elegant p-4 text-center">
            <div className="text-2xl font-bold font-display text-[color:var(--warning)]">1</div>
            <p className="text-xs text-muted-foreground mt-1">Expire bientôt</p>
          </div>
          <div className="card-elegant p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Support WhatsApp</p>
          </div>
          <div className="card-elegant p-4 text-center">
            <div className="w-8 h-8 mx-auto rounded-full bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-[color:var(--primary)] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Compte sécurisé</p>
          </div>
        </div>

        {/* Services header */}
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Mes services</h2>
          <span className="text-xs bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[color:var(--gold)] px-3 py-1 rounded-full font-medium border border-[color-mix(in_oklab,var(--gold)_30%,transparent)]">4 actifs</span>
        </div>

        {/* Service cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {profiles.map((p) => {
            const isRevealed = revealed[p.id] || false;
            return (
              <div key={p.id} className="card-service p-0 overflow-hidden flex flex-col">
                {/* Service header with gradient */}
                <div className={`relative px-5 py-4 bg-gradient-to-r ${p.gradient}`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                        {p.icon}
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-white">{p.service}</h3>
                        <p className="text-xs text-white/70">{p.account}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${p.daysLeft <= 7 ? "bg-amber-500/30 text-amber-100" : "bg-emerald-500/30 text-emerald-100"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {p.daysLeft <= 7 ? "Expire bientôt" : "Actif"}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profil / Place</p>
                      <p className="text-sm font-semibold mt-0.5">{p.profile_name}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expiration</p>
                      <p className="text-sm font-semibold mt-0.5">{p.daysLeft}j restants</p>
                    </div>
                  </div>

                  {p.pin && (
                    <div className="p-3 rounded-lg bg-background/50 border border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">PIN</span>
                      <span className="font-mono text-sm font-medium">{p.pin}</span>
                    </div>
                  )}

                  {/* Credentials section */}
                  <div className="p-4 rounded-xl bg-background/80 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Identifiants
                      </span>
                      <button
                        onClick={() => setRevealed((r) => ({ ...r, [p.id]: !isRevealed }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[color:var(--gold)] border border-[color-mix(in_oklab,var(--gold)_30%,transparent)] inline-flex items-center gap-1.5 hover:bg-[color-mix(in_oklab,var(--gold)_25%,transparent)] transition-colors"
                      >
                        {isRevealed ? <><EyeOff className="w-3 h-3" /> Masquer</> : <><Eye className="w-3 h-3" /> Afficher</>}
                      </button>
                    </div>

                    {isRevealed ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">Email</p>
                            <p className="text-sm truncate">{p.email}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(p.email); toast.success("Email copié"); }} className="p-1.5 rounded-md hover:bg-background shrink-0">
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40">
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">Mot de passe</p>
                            <p className="text-sm font-mono">{p.password}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(p.password); toast.success("Mot de passe copié"); }} className="p-1.5 rounded-md hover:bg-background shrink-0">
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                        <Lock className="w-4 h-4 mr-2" />
                        Cliquez sur "Afficher" pour voir vos identifiants
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed mt-auto">
                    <strong className="text-foreground">Instructions :</strong> {p.instructions}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Renewals */}
        <section className="card-elegant p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[color:var(--gold)]" />
            Mes renouvellements
          </h2>
          <div className="space-y-3">
            {profiles.filter((p) => p.daysLeft <= 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-background/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white`}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.service}</p>
                    <p className="text-xs text-muted-foreground">{p.daysLeft} jours restants</p>
                  </div>
                </div>
                <button className="text-xs px-4 py-2 rounded-lg btn-gold font-medium">
                  Renouveler
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="card-elegant p-6">
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[color:var(--primary)]" />
            Sécurité
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
              <span className="w-8 h-8 rounded-lg bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-[color:var(--primary)] flex items-center justify-center"><KeyRound className="w-4 h-4" /></span>
              <span className="text-sm">Votre code est personnel et confidentiel.</span>
            </li>
            <li className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
              <span className="w-8 h-8 rounded-lg bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-[color:var(--primary)] flex items-center justify-center"><Lock className="w-4 h-4" /></span>
              <span className="text-sm">Ne partagez pas vos accès avec d'autres personnes.</span>
            </li>
            <li className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
              <span className="w-8 h-8 rounded-lg bg-[color-mix(in_oklab,var(--primary)_15%,transparent)] text-[color:var(--primary)] flex items-center justify-center"><Eye className="w-4 h-4" /></span>
              <span className="text-sm">Chaque consultation d'identifiants est enregistrée.</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
