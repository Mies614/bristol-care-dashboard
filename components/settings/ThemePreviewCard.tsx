"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAccessibleMotion, safeTransition, fadeInScale } from "@/lib/design/motion";
import type { ThemePreviewConfig } from "./themePreviewPresets";

interface Props {
  config: ThemePreviewConfig;
  selected: boolean;
  onClick: () => void;
}

function Decoration({ type, color }: { type: ThemePreviewConfig["decorationType"]; color: string }) {
  if (type === "none") return null;
  if (type === "heart") {
    return (
      <div className="absolute top-2 right-2 text-xs leading-none" style={{ color }}>
        ♥
      </div>
    );
  }
  if (type === "star") {
    return (
      <div className="absolute top-2 right-2 text-xs leading-none" style={{ color }}>
        ✦
      </div>
    );
  }
  if (type === "moon") {
    return (
      <div className="absolute top-2 right-2 text-xs leading-none opacity-40" style={{ color }}>
        ☾
      </div>
    );
  }
  if (type === "tape") {
    return (
      <>
        <div
          className="absolute -top-1 -left-1 h-3 w-6 rotate-[-12deg] rounded-sm opacity-60"
          style={{ backgroundColor: color }}
        />
        <div
          className="absolute -bottom-1 -right-1 h-3 w-6 rotate-[8deg] rounded-sm opacity-50"
          style={{ backgroundColor: color }}
        />
      </>
    );
  }
  if (type === "dot-row") {
    return (
      <div className="absolute top-2 right-2 flex gap-[2px]">
        <span className="block h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
        <span className="block h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
        <span className="block h-[4px] w-[4px] rounded-full" style={{ backgroundColor: color, opacity: 0.3 }} />
      </div>
    );
  }
  if (type === "border-glow") {
    return (
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40"
        style={{ boxShadow: `inset 0 0 12px ${color}` }}
      />
    );
  }
  if (type === "gradient-strip") {
    return (
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    );
  }
  return null;
}

function BadgeShape({ bg, text, shape }: { bg: string; text: string; shape: ThemePreviewConfig["badgeShape"] }) {
  const shapeClass =
    shape === "pill"
      ? "rounded-full px-1.5 py-0.5"
      : shape === "dot"
        ? "rounded-full h-[5px] w-[5px]"
        : shape === "square"
          ? "rounded-[2px] px-1 py-0.5"
          : "rounded-md px-1 py-0.5";

  if (shape === "dot") {
    return <span className={`block ${shapeClass}`} style={{ backgroundColor: bg }} />;
  }
  return (
    <span
      className={`block text-[8px] font-medium leading-none ${shapeClass}`}
      style={{ backgroundColor: bg, color: text }}
    >
      NEW
    </span>
  );
}

export function ThemePreviewCard({ config, selected, onClick }: Props) {
  const reduceMotion = useAccessibleMotion();
  const isDark = config.style === "night";

  return (
    <motion.button
      onClick={onClick}
      type="button"
      className={cn(
        "group relative w-full min-w-0 overflow-hidden text-left transition-shadow duration-200",
        "rounded-[1.5rem] border-2",
        "hover:shadow-md",
        selected
          ? "border-[var(--app-accent)] bg-white/85 shadow-md shadow-[var(--app-accent)]/10"
          : "border-white/75 bg-white/65 hover:bg-white/80",
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 1px var(--app-accent), 0 8px 30px rgba(0,0,0,0.08), 0 0 16px var(--app-accent)/0.15` }
          : undefined
      }
      variants={reduceMotion ? undefined : fadeInScale}
      initial="hidden"
      animate="visible"
      whileHover={reduceMotion ? undefined : { scale: 1.015 }}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={safeTransition({ duration: 0.35, ease: "easeOut" }, reduceMotion)}
    >
      {/* Selected check icon with entrance animation */}
      {selected && (
        <motion.div
          className="absolute top-2.5 right-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-accent)] text-white text-xs font-bold shadow-sm"
          initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={safeTransition({ type: "spring", stiffness: 500, damping: 24 }, reduceMotion)}
        >
          ✓
        </motion.div>
      )}

      {/* ─── Mini Preview Area ─── */}
      <div
        className="relative h-28 overflow-hidden border-b"
        style={{
          background: config.bgGradient,
          borderColor: config.cardBorder,
        }}
      >
        <Decoration type={config.decorationType} color={config.decorationColor} />

        {/* mini hero */}
        <div
          className="h-10"
          style={{
            background: config.heroBg,
          }}
        >
          <div className="flex items-center gap-1 px-2 pt-2">
            <span className="block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: config.heroAccent, opacity: 0.6 }} />
            <span className="block h-[6px] w-12 rounded-full" style={{ backgroundColor: config.heroAccent, opacity: 0.3 }} />
          </div>
        </div>

        {/* mini cards */}
        <div className="relative z-10 -mt-1 px-2">
          {/* card 1 */}
          <motion.div
            className="mb-1 rounded-md border px-2 py-1.5"
            style={{
              backgroundColor: config.cardBg,
              borderColor: config.cardBorder,
              borderRadius: config.cardRadius,
              boxShadow: config.cardShadow,
            }}
            animate={reduceMotion ? undefined : { y: [0, -1, 0] }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: selected ? 0 : 0.8 }
            }
          >
            <div className="flex items-center justify-between">
              <span
                className="block h-[5px] w-10 rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.25)" }}
              />
              <BadgeShape bg={config.badgeBg} text={config.badgeText} shape={config.badgeShape} />
            </div>
            <span
              className="mt-1 block h-[3px] w-3/4 rounded-full"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }}
            />
          </motion.div>

          {/* card 2 */}
          <motion.div
            className="rounded-md border px-2 py-1"
            style={{
              backgroundColor: config.cardBg,
              borderColor: config.cardBorder,
              borderRadius: config.cardRadius,
              boxShadow: config.cardShadow,
            }}
            animate={reduceMotion ? undefined : { y: [0, -0.5, 0] }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: selected ? 0 : 1.2 }
            }
          >
            <div className="flex items-center gap-1">
              {/* mini button */}
              <span
                className="block h-[8px] w-[8px] border"
                style={{
                  backgroundColor: config.btnBg,
                  borderColor: "transparent",
                  borderRadius: config.btnRadius === "9999px" ? "9999px" : config.btnRadius,
                  boxShadow: config.btnShadow,
                }}
              />
              <span
                className="block h-[3px] w-8 rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}
              />
              <span
                className="ml-auto block h-[3px] w-5 rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
              />
            </div>
          </motion.div>
        </div>

        {/* mini bottom nav */}
        <div
          className="absolute bottom-1.5 left-2 right-2 flex items-center gap-1 rounded-lg border px-1.5 py-1"
          style={{
            backgroundColor: config.navBg,
            borderColor: config.navBorder,
            borderRadius: config.navRadius,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="block h-[5px] flex-1 rounded-full"
              style={{
                backgroundColor: i === 1 ? config.navItemActive : config.navItemInactive,
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── Info Area ─── */}
      <div className="px-4 py-3">
        <p
          className="text-sm font-semibold leading-tight"
          style={{ color: isDark ? "#f7f1ff" : "#5f4b44" }}
        >
          {config.name}
        </p>
        <p
          className="mt-0.5 text-xs leading-5"
          style={{ color: isDark ? "rgba(247,241,255,0.55)" : "rgba(95,75,68,0.55)" }}
        >
          {config.description}
        </p>
        <p
          className="mt-1 text-xs leading-4 opacity-50"
          style={{ color: isDark ? "rgba(247,241,255,0.4)" : "rgba(95,75,68,0.4)" }}
        >
          {config.tagline}
        </p>
      </div>
    </motion.button>
  );
}