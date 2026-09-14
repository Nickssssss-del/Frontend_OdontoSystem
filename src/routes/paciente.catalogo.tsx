import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Info, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DentistCard } from "@/components/DentistCard";
import { dentists, especialidades } from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/catalogo")({
  head: () => ({
    meta: [
      { title: "Buscar dentistas en Ica | OdontoSystem" },
      {
        name: "description",
        content:
          "Compara odontólogos colegiados en Ica por especialidad, calificación, precio base y cercanía. Reserva con anticipo por Yape o Plin.",
      },
      { property: "og:title", content: "Buscar dentistas en Ica | OdontoSystem" },
      {
        property: "og:description",
        content: "Catálogo de odontólogos con colegiatura COP verificada en Ica.",
      },
    ],
  }),
  component: Catalogo,
});

const distritos = ["Todos", "Ica Centro", "San Joaquín", "Parcona", "La Tinguiña", "Salas Guadalupe"];
const ordenes = [
  { id: "rating", label: "Mejor calificados" },
  { id: "precio", label: "Menor precio" },
  { id: "cerca", label: "Más cercanos" },
] as const;

function Catalogo() {
  const { isBanned } = useAppState();
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState<string[]>([]);
  const [distrito, setDistrito] = React.useState("Todos");
  const [maxPrecio, setMaxPrecio] = React.useState(100);
  const [orden, setOrden] = React.useState<(typeof ordenes)[number]["id"]>("rating");

  const toggleChip = (c: string) =>
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const results = React.useMemo(() => {
    const list = dentists
      .filter((d) => d.verified)
      .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
      .filter((d) => (chips.length ? chips.some((c) => d.specialties.includes(c)) : true))
      .filter((d) => (distrito === "Todos" ? true : d.district === distrito))
      .filter((d) => d.price <= maxPrecio);
    return [...list].sort((a, b) =>
      orden === "precio"
        ? a.price - b.price
        : orden === "cerca"
          ? a.distanceKm - b.distanceKm
          : b.rating - a.rating,
    );
  }, [query, chips, distrito, maxPrecio, orden]);

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-semibold">Dentistas en Ica</h1>
        <p className="mt-1 text-muted-foreground">
          Filtros en tiempo real por especialidad, reputación, precio base y cercanía.
        </p>
      </motion.div>

      <AnimatePresence>
        {isBanned && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">
                  Cuenta suspendida temporalmente por inasistencias
                </p>
                <p className="text-sm text-muted-foreground">
                  Alcanzaste el límite de strikes. El botón de reservar está deshabilitado hasta que
                  un odontólogo restablezca tu puntualidad.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca por nombre del odontólogo…"
            className="h-12 w-full rounded-2xl border border-input bg-background pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {especialidades.map((c) => (
            <motion.button
              key={c}
              whileTap={{ scale: 0.94 }}
              onClick={() => toggleChip(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                chips.includes(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50",
              )}
            >
              {c}
            </motion.button>
          ))}
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1.5 flex items-center gap-1 font-medium text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> Distrito
            </span>
            <select
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {distritos.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-muted-foreground">
              Precio base hasta S/ {maxPrecio}
            </span>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={maxPrecio}
              onChange={(e) => setMaxPrecio(Number(e.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-muted-foreground">Ordenar por</span>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as typeof orden)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {ordenes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {results.length} odontólogo(s) disponibles
      </p>

      <motion.div layout className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {results.map((d, i) => (
            <DentistCard key={d.id} dentist={d} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>

      {results.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 text-center text-muted-foreground"
        >
          No encontramos odontólogos con esos filtros. Prueba ampliar el precio o el distrito.
        </motion.p>
      )}

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          1 perfil no aparece en esta búsqueda pública porque su colegiatura COP está
          <span className="font-semibold text-warning-foreground"> En Revisión</span>. Se publicará
          automáticamente al validarse.
        </p>
      </div>
    </AppShell>
  );
}
