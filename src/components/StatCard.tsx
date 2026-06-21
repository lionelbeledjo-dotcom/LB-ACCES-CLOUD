import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "gold" | "success" | "warning" | "danger";
}) {
  const accentColor =
    accent === "gold"
      ? "var(--gold)"
      : accent === "success"
      ? "var(--success)"
      : accent === "warning"
      ? "var(--warning)"
      : accent === "danger"
      ? "var(--destructive)"
      : "var(--primary)";

  return (
    <div className="card-elegant p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-[color-mix(in_oklab,var(--gold)_20%,transparent)] transition-colors">
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.08] blur-2xl group-hover:opacity-[0.12] transition-opacity"
        style={{ background: accentColor }}
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${accentColor} 12%, transparent)`, color: accentColor }}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div className="relative font-display text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="relative text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
