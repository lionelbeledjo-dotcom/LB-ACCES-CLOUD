import { Link } from "@tanstack/react-router";

export function BrandLogo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const sizes = {
    sm: { box: "w-8 h-8", text: "text-base", sub: "text-[10px]" },
    md: { box: "w-10 h-10", text: "text-lg", sub: "text-[11px]" },
    lg: { box: "w-14 h-14", text: "text-2xl", sub: "text-xs" },
  }[size];
  return (
    <Link to="/" className="inline-flex items-center gap-3 group">
      <span
        className={`${sizes.box} rounded-xl flex items-center justify-center font-display font-bold glow-gold`}
        style={{
          background: "linear-gradient(135deg, var(--gold), color-mix(in oklab, var(--gold) 70%, white))",
          color: "var(--gold-foreground)",
        }}
      >
        LB
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`font-display font-semibold tracking-tight ${sizes.text} ${inverted ? "text-sidebar-foreground" : "text-foreground"}`}>
          LB Access <span className="text-[color:var(--gold)]">Cloud</span>
        </span>
        <span className={`uppercase tracking-[0.18em] ${sizes.sub} ${inverted ? "text-sidebar-foreground/60" : "text-muted-foreground"}`}>
          Gestion d'accès premium
        </span>
      </span>
    </Link>
  );
}
