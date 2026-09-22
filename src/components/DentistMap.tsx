import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Navigation, Plus, Minus } from "lucide-react";
import * as React from "react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";

/**
 * Mapa estilizado de Ica. Simula un mapa interactivo con pines posicionados
 * de forma absoluta sobre un fondo con cuadrícula y "calles". Los pines son
 * clicables y enlazan al perfil del dentista.
 */
export function DentistMap({ dentists }: { dentists: Dentist[] }) {
  const [zoom, setZoom] = React.useState(1);
  const [hovered, setHovered] = React.useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="relative h-[280px] overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,var(--color-secondary),var(--color-background))]">
        {/* Cuadrícula que simula calles */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--color-primary) 14%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--color-primary) 14%, transparent) 1px, transparent 1px)",
            backgroundSize: `${36 * zoom}px ${36 * zoom}px`,
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        />
        {/* Avenidas destacadas */}
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/20" />
        <div className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-primary/20" />

        {/* Etiquetas de distritos como referencia */}
        <span className="absolute left-[8%] top-[12%] text-[10px] font-semibold text-muted-foreground/70">
          Ica
        </span>
        <span className="absolute right-[14%] top-[10%] text-[10px] font-semibold text-muted-foreground/70">
          Parcona
        </span>
        <span className="absolute left-[30%] bottom-[10%] text-[10px] font-semibold text-muted-foreground/70">
          La Tinguiña
        </span>
        <span className="absolute right-[6%] bottom-[14%] text-[10px] font-semibold text-muted-foreground/70">
          Subtanjalla
        </span>

        {/* Pines */}
        <AnimatePresence>
          {dentists.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: -14, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 380, damping: 22, delay: i * 0.05 }}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${d.pin.x}%`, top: `${d.pin.y}%` }}
            >
              <Link
                to="/paciente/dentista/$id"
                params={{ id: d.id }}
                onMouseEnter={() => setHovered(d.id)}
                onMouseLeave={() => setHovered(null)}
                className="group relative flex flex-col items-center"
                aria-label={`${d.name} en ${d.district}`}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {hovered === d.id && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full mb-1.5 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1 text-[11px] font-medium text-background shadow-lg"
                    >
                      {d.name} · {soles(d.price)}
                    </motion.span>
                  )}
                </AnimatePresence>
                <MapPin className="size-7 fill-primary text-primary drop-shadow-md transition-transform group-hover:scale-125" />
                <span className="h-2 w-px bg-primary/50" />
              </Link>
              {/* Pulso */}
              {hovered === d.id && (
                <motion.span
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="pointer-events-none absolute -top-1 left-1/2 size-3 -translate-x-1/2 rounded-full bg-primary/40"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Controles de zoom (decorativos) */}
        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-border bg-card/90 shadow-sm backdrop-blur">
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
            className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted"
            aria-label="Acercar"
          >
            <Plus className="size-3.5" />
          </button>
          <span className="h-px bg-border" />
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted"
            aria-label="Alejar"
          >
            <Minus className="size-3.5" />
          </button>
        </div>

        {/* Brújula + etiqueta */}
        <span className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Navigation className="size-3" /> Mapa de Ica
        </span>
        <span className="absolute bottom-2 right-3 text-[11px] font-medium text-muted-foreground">
          {dentists.length} consultorios
        </span>
      </div>

      {/* Tarjetas resumidas de los primeros dos resultados */}
      <div className="grid gap-3 sm:grid-cols-2">
        {dentists.slice(0, 2).map((d) => (
          <Link
            key={d.id}
            to="/paciente/dentista/$id"
            params={{ id: d.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-semibold text-primary">
              {d.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{d.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.specialty} — {d.district} · desde {soles(d.price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
