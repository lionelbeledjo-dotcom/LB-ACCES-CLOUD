import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  Calendar,
  User as UserIcon,
  KeyRound,
  Mail,
  Tv,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { StatusBadge, profileStatusMeta } from "@/components/StatusBadge";
import {
  getClientSpace,
  revealClientPassword,
  submitSupportRequest,
  trackCredentialCopy,
} from "@/lib/access.functions";

export const Route = createFileRoute("/espace/$token")({
  head: () => ({
    meta: [
      { title: "Mon espace — LB Access Cloud" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientPortal,
});

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function ClientPortal() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchSpace = useServerFn(getClientSpace);
  const reveal = useServerFn(revealClientPassword);
  const support = useServerFn(submitSupportRequest);
  const trackCopy = useServerFn(trackCredentialCopy);

  const { data, isLoading } = useQuery({
    queryKey: ["client-space", token],
    queryFn: async () => fetchSpace({ data: { token } }),
    staleTime: 30_000,
  });

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const revealMutation = useMutation({
    mutationFn: async (profileId: string) => reveal({ data: { token, profileId } }),
    onSuccess: (res, profileId) => {
      if (res.ok) {
        setRevealed((r) => ({ ...r, [profileId]: res.password }));
        toast.success("Mot de passe affiché. Cet accès est enregistré.");
      } else toast.error(res.error);
    },
  });

  const supportMutation = useMutation({
    mutationFn: async () => support({ data: { token, subject: supportSubject, message: supportMessage } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Votre demande a été envoyée. Nous revenons vers vous rapidement.");
        setSupportOpen(false);
        setSupportSubject("");
        setSupportMessage("");
      } else toast.error(res.error);
    },
  });

  const copy = async (text: string, label: string, profileId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
      if (profileId) {
        trackCopy({ data: { token, profileId, field: label } }).catch(() => {});
      }
    } catch {
      toast.error("Impossible de copier");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !data.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-elegant p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 mx-auto text-[color:var(--warning)]" />
          <h1 className="font-display text-2xl mt-3">Accès expiré</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Votre session a expiré. Veuillez vous reconnecter avec votre code.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const { client, profiles } = data;
  const whatsappNumber = (client.whatsapp || client.phone || "").replace(/\D/g, "");
  const supportMsgTemplate = encodeURIComponent(
    `Bonjour, je suis ${client.full_name}. J'ai besoin d'aide concernant mon espace LB Access Cloud.`,
  );

  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-6 py-5 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur">
        <BrandLogo size="sm" />
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Quitter</Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="card-elegant p-6 sm:p-8 relative overflow-hidden">
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-15 blur-3xl"
            style={{ background: "var(--gold)" }}
          />
          <div className="relative">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Bienvenue</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">{client.full_name}</h1>
            <p className="text-muted-foreground mt-1.5">Voici vos abonnements et accès assignés.</p>
          </div>
        </section>

        {profiles.length === 0 && (
          <div className="card-elegant p-8 text-center">
            <p className="text-muted-foreground">Aucun accès actif pour le moment.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {profiles.map((p) => {
            const acc = p.service_account as {
              id: string;
              account_label: string;
              login_email: string;
              renewal_date: string | null;
              status: string;
              service: { name: string; category: string | null; icon: string | null; instructions_template: string | null } | null;
            } | null;
            const service = acc?.service;
            const isRevealed = revealed[p.id] !== undefined;
            const meta = profileStatusMeta[p.status] || profileStatusMeta.libre;

            return (
              <div key={p.id} className="card-elegant p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[color:var(--primary)] flex items-center justify-center">
                      <Tv className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold leading-tight">{service?.name || "Service"}</h2>
                      <p className="text-xs text-muted-foreground">{acc?.account_label}</p>
                    </div>
                  </div>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>

                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <Row
                    icon={UserIcon}
                    label="Profil"
                    value={
                      <span>
                        <span className="font-medium">{p.profile_name || `Profil ${p.profile_number}`}</span>
                        <span className="text-muted-foreground"> · n° {p.profile_number}</span>
                      </span>
                    }
                    copyValue={p.profile_name || `Profil ${p.profile_number}`}
                    onCopy={(text, label) => copy(text, label, p.id)}
                    copyLabel="Profil"
                  />
                  {p.profile_pin && (
                    <Row
                      icon={KeyRound}
                      label="PIN du profil"
                      value={<span className="font-mono">{p.profile_pin}</span>}
                      copyValue={p.profile_pin}
                      onCopy={(text, label) => copy(text, label, p.id)}
                      copyLabel="PIN"
                    />
                  )}
                  {acc?.login_email && (
                    <Row
                      icon={Mail}
                      label="Email de connexion"
                      value={<span className="break-all">{acc.login_email}</span>}
                      copyValue={acc.login_email}
                      onCopy={(text, label) => copy(text, label, p.id)}
                      copyLabel="Email"
                    />
                  )}

                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-accent/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground shrink-0">Mot de passe</span>
                      <span className="font-mono text-sm truncate">
                        {isRevealed ? revealed[p.id] || "(vide)" : "••••••••••"}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isRevealed && revealed[p.id] && (
                        <button
                          onClick={() => copy(revealed[p.id]!, "Mot de passe")}
                          className="p-1.5 rounded-md hover:bg-background"
                          title="Copier"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (isRevealed) {
                            setRevealed((r) => {
                              const c = { ...r };
                              delete c[p.id];
                              return c;
                            });
                          } else if (confirming === p.id) {
                            revealMutation.mutate(p.id);
                            setConfirming(null);
                          } else {
                            setConfirming(p.id);
                            setTimeout(() => setConfirming((c) => (c === p.id ? null : c)), 4000);
                          }
                        }}
                        className="px-2 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:opacity-95 inline-flex items-center gap-1"
                      >
                        {isRevealed ? (
                          <><EyeOff className="w-3.5 h-3.5" /> Masquer</>
                        ) : confirming === p.id ? (
                          "Confirmer"
                        ) : (
                          <><Eye className="w-3.5 h-3.5" /> Afficher</>
                        )}
                      </button>
                    </div>
                  </div>

                  <Row icon={Calendar} label="Date de fin" value={fmtDate(p.end_date)} />
                  {acc?.renewal_date && <Row icon={RefreshCw} label="Renouvellement compte" value={fmtDate(acc.renewal_date)} />}
                </dl>

                {service?.instructions_template && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                    <strong className="text-foreground">Instructions :</strong> {service.instructions_template}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <section className="grid sm:grid-cols-3 gap-3">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${supportMsgTemplate}`}
              target="_blank"
              rel="noreferrer"
              className="card-elegant p-4 flex items-center gap-3 hover:shadow-elegant transition-shadow"
            >
              <span className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">Support WhatsApp</span>
                <span className="block text-xs text-muted-foreground">Aide rapide</span>
              </span>
            </a>
          )}
          <button
            onClick={() => {
              setSupportSubject("Problème d'accès");
              setSupportOpen(true);
            }}
            className="card-elegant p-4 flex items-center gap-3 text-left hover:shadow-elegant transition-shadow"
          >
            <span className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">Problème d'accès</span>
              <span className="block text-xs text-muted-foreground">Signaler une difficulté</span>
            </span>
          </button>
          <button
            onClick={() => {
              setSupportSubject("Demande de renouvellement");
              setSupportOpen(true);
            }}
            className="card-elegant p-4 flex items-center gap-3 text-left hover:shadow-elegant transition-shadow"
          >
            <span className="w-10 h-10 rounded-xl bg-[color-mix(in_oklab,var(--gold)_25%,transparent)] text-[color:var(--gold-foreground)] flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-medium">Renouvellement</span>
              <span className="block text-xs text-muted-foreground">Demander à prolonger</span>
            </span>
          </button>
        </section>
      </main>

      {supportOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setSupportOpen(false)}>
          <div className="card-elegant w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-semibold">Envoyer une demande</h2>
            <p className="text-sm text-muted-foreground mt-1">Notre équipe vous répondra dans les plus brefs délais.</p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                supportMutation.mutate();
              }}
            >
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Sujet</label>
                <input
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Message</label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-input bg-background min-h-[120px]"
                  required
                  maxLength={2000}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setSupportOpen(false)} className="px-4 py-2 rounded-lg text-sm border border-input">Annuler</button>
                <button type="submit" disabled={supportMutation.isPending} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground disabled:opacity-50">
                  {supportMutation.isPending ? "Envoi…" : "Envoyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  copyValue,
  onCopy,
  copyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  copyValue?: string;
  onCopy?: (text: string, label: string) => void;
  copyLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-accent/40">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="truncate">{value}</span>
      </div>
      {copyValue && onCopy && (
        <button onClick={() => onCopy(copyValue, copyLabel || label)} className="p-1.5 rounded-md hover:bg-background shrink-0" title="Copier">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
