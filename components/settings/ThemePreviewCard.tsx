"use client";
import type { ThemeSettings } from "@/lib/types";

interface Props {
  theme: ThemeSettings;
  selected: boolean;
  name: string;
  description: string;
  onClick: () => void;
}

export function ThemePreviewCard({ theme, selected, name, description, onClick }: Props) {
  const accent = theme.style === "soft" ? "#8c6a60" 
    : theme.style === "romantic" ? "#b85f8a"
    : theme.style === "minimal" ? "#53606a"
    : theme.style === "study" ? "#4f7f75"
    : theme.style === "night" ? "#d9c2ff"
    : "#765f55";
  
  const navBg = theme.style === "night" ? "#1f1c28" : "rgba(255,255,255,0.7)";
  const borderColor = theme.style === "night" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)";

  return (
    <button
      onClick={onClick}
      className={`relative w-full min-w-0 overflow-hidden rounded-[1.5rem] border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-[var(--app-accent)] bg-white/85 shadow-md"
          : "border-white/75 bg-white/65 hover:bg-white/80 hover:shadow-sm"
      }`}
    >
      {/* Mini preview */}
      <div className="mb-3 h-20 overflow-hidden rounded-[1rem] border shadow-sm" style={{ background: `linear-gradient(135deg, ${accent}55, ${accent}22)`, borderColor }}>
        <div className="flex h-full flex-col justify-end p-2" style={{ backgroundColor: theme.style === "night" ? "rgba(35,31,45,0.7)" : "rgba(255,255,255,0.4)" }}>
          <div className="mb-1 h-2 w-2/3 rounded-full" style={{ backgroundColor: accent, opacity: 0.6 }} />
          <div className="flex gap-1">
            <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: navBg, border: `1px solid ${borderColor}` }} />
            <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: accent, opacity: 0.3 }} />
            <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: navBg, border: `1px solid ${borderColor}` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold" style={{ color: theme.style === "night" ? "#f7f1ff" : "#5f4b44" }}>{name}</p>
        <p className="mt-0.5 break-words text-xs leading-4" style={{ color: theme.style === "night" ? "rgba(247,241,255,0.6)" : "rgba(95,75,68,0.6)" }}>{description}</p>
      </div>
        {selected && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white shadow-sm" style={{ backgroundColor: accent }}>
            ✓
          </span>
        )}
      </div>
    </button>
  );
}