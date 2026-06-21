import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[color:var(--success)] border-[color-mix(in_oklab,var(--success)_30%,transparent)]",
  warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-[color:var(--warning-foreground)] border-[color-mix(in_oklab,var(--warning)_40%,transparent)]",
  danger: "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)] border-[color-mix(in_oklab,var(--destructive)_30%,transparent)]",
  info: "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[color:var(--primary)] border-[color-mix(in_oklab,var(--primary)_28%,transparent)]",
  gold: "bg-[color-mix(in_oklab,var(--gold)_20%,transparent)] text-[color:var(--gold-foreground)] border-[color-mix(in_oklab,var(--gold)_45%,transparent)]",
};

export function StatusBadge({ label, tone = "neutral", className }: { label: string; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

export const clientStatusMeta: Record<string, { label: string; tone: Tone }> = {
  actif: { label: "Actif", tone: "success" },
  en_attente_paiement: { label: "En attente de paiement", tone: "warning" },
  expire_bientot: { label: "Expire bientôt", tone: "warning" },
  suspendu: { label: "Suspendu", tone: "danger" },
  expire: { label: "Expiré", tone: "danger" },
};

export const accountStatusMeta: Record<string, { label: string; tone: Tone }> = {
  disponible: { label: "Disponible", tone: "success" },
  complet: { label: "Complet", tone: "info" },
  a_renouveler: { label: "À renouveler", tone: "warning" },
  suspendu: { label: "Suspendu", tone: "danger" },
  expire: { label: "Expiré", tone: "danger" },
};

export const profileStatusMeta: Record<string, { label: string; tone: Tone }> = {
  libre: { label: "Libre", tone: "neutral" },
  occupe: { label: "Occupé", tone: "success" },
  suspendu: { label: "Suspendu", tone: "danger" },
  expire: { label: "Expiré", tone: "danger" },
};

export const paymentMethodLabel: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  carte: "Carte",
  autre: "Autre",
};

export const paymentStatusMeta: Record<string, { label: string; tone: Tone }> = {
  paye: { label: "Payé", tone: "success" },
  en_attente: { label: "En attente", tone: "warning" },
  annule: { label: "Annulé", tone: "danger" },
};
