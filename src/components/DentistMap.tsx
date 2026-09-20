import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, MoreHorizontal } from "lucide-react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";

export function DentistMap({ dentists }: { dentists: Dentist[] }) {
  return (
    <div className="space-y-3">
      <div className="relative h-[220px] overflow-hidden rounded-2xl border border-border bg-muted/40">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />
        <AnimatePresence>
          {dentists.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -14, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 380, damping: 22, delay: i * 0.05 }}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${d.pin.x}%`, top: `${d.pin.y}%` }}
            >
              <Link
                to="/paciente/dentista/$id"
                params={{ id: d.id }}
                className="group flex flex-col items-center"
                aria-label={`${d.name} en ${d.district}`}
              >
                <span className="absolute bottom-full mb-1 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-[11px] font-medium text-background group-hover:block">
                  {d.name} · {d.district}
                </span>
                <MapPin className="size-6 fill-primary text-primary drop-shadow-sm transition-transform group-hover:scale-110" />
                <span className="h-2 w-px bg-muted-foreground/60" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
        <MoreHorizontal className="absolute right-3 top-3 size-4 text-muted-foreground" />
        <span className="absolute bottom-2 right-3 text-[11px] font-medium text-muted-foreground">
          Mapa de Ica
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {dentists.slice(0, 2).map((d) => (
          <Link
            key={d.id}
            to="/paciente/dentista/$id"
            params={{ id: d.id }}
            className="rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-semibold">{d.name}</p>
            <p className="text-xs text-muted-foreground">
              {d.specialty} — {d.district} · desde {soles(d.price)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
