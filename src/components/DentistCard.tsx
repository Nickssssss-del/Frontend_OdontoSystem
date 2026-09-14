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
      className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/10"
    >
      <div
        className={cn(
          "relative flex h-32 items-center justify-center bg-gradient-to-br",
          dentist.tint,
        )}
      >
        <span className="font-display text-3xl font-semibold text-foreground/80">
          {dentist.initials}
        </span>
        {dentist.verified ? (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur">
            <BadgeCheck className="size-3.5" /> Colegiado Verificado
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-warning/25 px-2.5 py-1 text-[11px] font-semibold text-warning-foreground backdrop-blur">
            Colegiatura en revisión
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold leading-tight">{dentist.name}</h3>
          <p className="text-sm text-muted-foreground">
            {dentist.specialty} · {dentist.cop}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <Star className="size-4 fill-warning text-warning" />
            {dentist.rating.toFixed(1)}
          </span>
          <span className="text-muted-foreground">({dentist.reviews} reseñas)</span>
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" /> {dentist.district} · {dentist.distanceKm} km
        </p>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Desde</p>
            <p className="font-display text-lg font-semibold text-primary">
              {soles(dentist.price)}
            </p>
          </div>
          <Link
            to="/paciente/dentista/$id"
            params={{ id: dentist.id }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-105"
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
