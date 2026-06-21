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
    <div className="card-elegant p-5 flex flex-col gap-3 relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-15 blur-2xl"
        style={{ background: accentColor }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${accentColor} 14%, transparent)`, color: accentColor }}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
