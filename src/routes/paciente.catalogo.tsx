import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Info, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DentistCard } from "@/components/DentistCard";
import { DentistMap } from "@/components/DentistMap";
import { dentists, especialidades } from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const distritos = ["Todos", "Ica", "La Tinguiña", "Parcona", "Subtanjalla"] as const;
const ordenes = [
  { id: "rating", label: "Mejor calificados" },
  { id: "precio", label: "Menor precio" },
  { id: "cerca", label: "Más cercanos" },
] as const;

function Catalogo() {
  const { isBanned } = useAppState();
  const [query, setQuery] = React.useState("");
  const [chips, setChips] = React.useState<string[]>([]);
  const [distrito, setDistrito] = React.useState<string>("Todos");
  const [especialidad, setEspecialidad] = React.useState<string>("Todas");
  const [maxPrecio, setMaxPrecio] = React.useState(100);
  const [orden, setOrden] = React.useState<(typeof ordenes)[number]["id"]>("rating");

  const toggleChip = (c: string) =>
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const results = React.useMemo(() => {
    const list = dentists
      .filter((d) => d.verified)
      .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
      .filter((d) => (chips.length ? chips.some((c) => d.specialties.includes(c)) : true))
      .filter((d) => (especialidad === "Todas" ? true : d.specialties.includes(especialidad)))
      .filter((d) => (distrito === "Todos" ? true : d.district === distrito))
      .filter((d) => d.price <= maxPrecio);
    return [...list].sort((a, b) =>
      orden === "precio"
        ? a.price - b.price
        : orden === "cerca"
          ? a.distanceKm - b.distanceKm
          : b.rating - a.rating,
    );
  }, [query, chips, distrito, especialidad, maxPrecio, orden]);

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

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        {/* ===== Sidebar de Filtros ===== */}
        <aside className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            <p className="font-display text-base font-semibold">Filtros</p>
          </div>

          {/* Búsqueda por nombre */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca por nombre…"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Distrito (Select) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted-foreground">
              Distrito de Ica
            </label>
            <Select value={distrito} onValueChange={setDistrito}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Todos los distritos" />
              </SelectTrigger>
              <SelectContent>
                {distritos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Especialidad (Select) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted-foreground">Especialidad</label>
            <Select value={especialidad} onValueChange={setEspecialidad}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Todas las especialidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {especialidades.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chips de especialidades rápidas */}
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-muted-foreground">Acceso rápido</span>
            <div className="flex flex-wrap gap-2">
              {especialidades.map((c) => (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => toggleChip(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    chips.includes(c)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Precio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Precio base</span>
              <span className="text-sm font-semibold text-primary">hasta S/ {maxPrecio}</span>
            </div>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={maxPrecio}
              onChange={(e) => setMaxPrecio(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Ordenar */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-muted-foreground">Ordenar por</label>
            <Select value={orden} onValueChange={(v) => setOrden(v as typeof orden)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ordenes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </aside>

        {/* ===== Área principal: mapa + grilla ===== */}
        <div className="space-y-5">
          {/* Mapa (mitad superior/derecha) */}
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <DentistMap dentists={results} />
          </div>

          {/* Grilla de tarjetas (mitad inferior/izquierda) */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.length} odontólogo(s) disponibles
            </p>
          </div>

          <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
              className="mt-6 text-center text-muted-foreground"
            >
              No encontramos odontólogos con esos filtros. Prueba ampliar el precio o el distrito.
            </motion.p>
          )}
        </div>
      </div>

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
