import { motion } from "motion/react";
import { STRIKE_LIMIT } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const levels = [
  { label: "Excelente puntualidad", bar: "bg-success", text: "text-success-foreground" },
  { label: "Atención: 1 inasistencia", bar: "bg-warning", text: "text-warning-foreground" },
  { label: "Riesgo de suspensión", bar: "bg-destructive", text: "text-destructive" },
  { label: "Cuenta suspendida", bar: "bg-destructive", text: "text-destructive" },
];

export function StrikeMeter({ strikes, compact }: { strikes: number; compact?: boolean }) {
  const level = levels[Math.min(strikes, levels.length - 1)] ?? levels[0]!;
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {Array.from({ length: STRIKE_LIMIT }, (_, i) => (
          <motion.span
            key={i}
            initial={{ scaleX: 0.6, opacity: 0.4 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 24 }}
            className={cn(
              "h-2 flex-1 origin-left rounded-full",
              i < strikes ? level.bar : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-semibold", level.text)}>
        {level.label}
        {!compact && (
          <span className="ml-1 font-normal text-muted-foreground">
            · {strikes}/{STRIKE_LIMIT} strikes
          </span>
        )}
      </p>
    </div>
  );
}
