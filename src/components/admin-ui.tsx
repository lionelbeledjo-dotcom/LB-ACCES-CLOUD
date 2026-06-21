export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card-elegant p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] text-[color:var(--gold)] flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const w = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className={`card-premium w-full ${w} p-6 max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export const inputCls = "w-full px-3 py-2.5 rounded-xl border border-input bg-background/80 focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40 focus:border-[color:var(--gold)]/60 text-sm transition-all";
export const btnPrimary = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity";
export const btnGold = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gold text-sm font-semibold disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-input bg-background/50 hover:bg-accent transition-colors";
export const btnDanger = "inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] text-[color:var(--destructive)] bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] hover:bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)]";
