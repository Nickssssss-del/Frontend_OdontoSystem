import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function DentistCard({ dentist, index = 0 }: { dentist: Dentist; index?: number }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 260, damping: 26 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/10"
    >
      {/* Header pastel con avatar de iniciales */}
      <div
        className={cn(
          "relative flex h-28 items-center justify-center bg-gradient-to-br",
          dentist.tint,
        )}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-card/80 font-display text-2xl font-semibold text-foreground/80 shadow-sm backdrop-blur">
          {dentist.initials}
        </span>
        {dentist.verified ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success-foreground backdrop-blur">
            <BadgeCheck className="size-3.5" /> COP Verificado
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-warning/25 px-2.5 py-1 text-[11px] font-semibold text-warning-foreground backdrop-blur">
            En revisión
          </span>
        )}
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card/80 px-2 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
          <Star className="size-3 fill-warning text-warning" />
          {dentist.rating > 0 ? dentist.rating.toFixed(1) : "—"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold leading-tight">
            {dentist.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{dentist.specialty}</p>
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary" /> {dentist.district} ·{" "}
          {dentist.distanceKm} km
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Desde</p>
            <p className="font-display text-lg font-semibold text-primary">
              {soles(dentist.price)}
            </p>
          </div>
          <Link
            to="/paciente/dentista/$id"
            params={{ id: dentist.id }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Ver Disponibilidad
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
