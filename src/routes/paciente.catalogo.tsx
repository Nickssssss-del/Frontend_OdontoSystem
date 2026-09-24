import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Info, Search, SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
  const [maxPrecio, setMaxPrecio] = React.useState([100]);
  const [orden, setOrden] = React.useState<(typeof ordenes)[number]["id"]>("rating");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = React.useState(true);

  const toggleChip = (c: string) =>
    setChips((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const results = React.useMemo(() => {
    const list = dentists
      .filter((d) => d.verified)
      .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
      .filter((d) => (chips.length ? chips.some((c) => d.specialties.includes(c)) : true))
      .filter((d) => (especialidad === "Todas" ? true : d.specialties.includes(especialidad)))
      .filter((d) => (distrito === "Todos" ? true : d.district === distrito))
      .filter((d) => d.price <= (maxPrecio[0] ?? 100));
    return [...list].sort((a, b) =>
      orden === "precio"
        ? a.price - b.price
        : orden === "cerca"
          ? a.distanceKm - b.distanceKm
          : b.rating - a.rating,
    );
  }, [query, chips, distrito, especialidad, maxPrecio, orden]);

  if (isBanned) {
    return (
      <AppShell>
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertTriangle className="size-5 flex-shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Cuenta suspendida</p>
            <p className="text-sm text-muted-foreground">
              Por incumplimientos repetidos. Contacta a soporte para apelar.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold">Dentistas en Ica</h1>
          <p className="mt-1 text-muted-foreground">
            Filtros en tiempo real por especialidad, reputación, precio base y cercanía.
          </p>
        </div>

        {/* ===================== MAPA (arriba, sin eliminar) ===================== */}
        <div className="mb-8 rounded-xl border border-border/70 overflow-hidden shadow-sm">
          <DentistMap dentists={results} />
        </div>

        {/* ===================== BUSCADOR PRINCIPAL ===================== */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
          <div className="flex-1">
            <Label htmlFor="search" className="text-xs text-muted-foreground mb-2 block">
              Buscar por nombre
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Ej: Claudia, Manrique..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden bg-muted/30">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors border-l border-border",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <List className="size-4" />
              </button>
            </div>

            {/* Filters Toggle */}
            <Button
              variant={filtersOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="gap-2"
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </div>
        </div>

        {/* ===================== LAYOUT: FILTROS LATERAL + RESULTADOS ===================== */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar de Filtros */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl border border-border/70 bg-card p-4 h-fit lg:sticky lg:top-24"
              >
                <div className="space-y-6">
                  {/* Especialidades */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Especialidad</h3>
                    <div className="space-y-2">
                      {["Todas", ...especialidades].map((esp) => (
                        <label key={esp} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={especialidad === esp}
                            onCheckedChange={() => setEspecialidad(esp)}
                          />
                          <span className="text-sm">{esp}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Precio Máximo */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Precio máximo</h3>
                    <Slider
                      value={maxPrecio}
                      onValueChange={setMaxPrecio}
                      min={0}
                      max={300}
                      step={10}
                      className="mb-2"
                    />
                    <p className="text-xs text-muted-foreground">Hasta S/ {(maxPrecio[0] ?? 100)}</p>
                  </div>

                  {/* Distrito */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Distrito</h3>
                    <Select value={distrito} onValueChange={setDistrito}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
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

                  {/* Orden */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Ordenar por</h3>
                    <Select value={orden} onValueChange={(v) => setOrden(v as typeof orden)}>
                      <SelectTrigger className="h-8 text-sm">
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

                  {/* Horario */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Horario disponible</h3>
                    <div className="space-y-2 text-sm">
                      {["Mañana", "Tarde", "Noche"].map((h) => (
                        <label key={h} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox />
                          <span>{h}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Calificación */}
                  <div>
                    <h3 className="font-semibold text-sm mb-3">Calificación mínima</h3>
                    <div className="space-y-2 text-sm">
                      {["5 ⭐", "4+ ⭐", "3+ ⭐"].map((r) => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox />
                          <span>{r}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Resultados */}
          <div>
            {/* Chips de filtros activos */}
            {(query || chips.length > 0 || distrito !== "Todos" || especialidad !== "Todas" || (maxPrecio[0] ?? 100) < 100) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {query && (
                  <Badge variant="secondary" className="gap-1">
                    {query}
                    <button onClick={() => setQuery("")} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {chips.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <button onClick={() => toggleChip(c)} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {especialidad !== "Todas" && (
                  <Badge variant="secondary" className="gap-1">
                    {especialidad}
                    <button onClick={() => setEspecialidad("Todas")} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {distrito !== "Todos" && (
                  <Badge variant="secondary" className="gap-1">
                    {distrito}
                    <button onClick={() => setDistrito("Todos")} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
                {(maxPrecio[0] ?? 100) < 100 && (
                  <Badge variant="secondary" className="gap-1">
                    Máx S/ {(maxPrecio[0] ?? 100)}
                    <button onClick={() => setMaxPrecio([100])} className="hover:opacity-75">
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* View Mode: Grid */}
            {viewMode === "grid" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {results.length > 0 ? (
                    results.map((d) => (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <DentistCard dentist={d} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center">
                      <Info className="size-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No hay odontólogos que coincidan con tus filtros.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* View Mode: List */}
            {viewMode === "list" && (
              <div className="space-y-3">
                <AnimatePresence>
                  {results.length > 0 ? (
                    results.map((d) => (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-start gap-4 rounded-lg border border-border/70 bg-card p-4 hover:shadow-md transition-shadow"
                      >
                        <div className={cn("size-16 rounded-lg bg-gradient-to-br flex items-center justify-center text-lg font-semibold text-white", d.tint)}>
                          {d.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{d.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{d.specialty} • {d.district}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {d.specialties.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{d.reviews} opiniones • Desde S/ {d.price}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{d.rating.toFixed(1)}</div>
                          <p className="text-xs text-muted-foreground">{d.distanceKm} km</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <Info className="size-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No hay odontólogos que coincidan con tus filtros.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Resultados Info */}
            {results.length > 0 && (
              <div className="mt-6 text-xs text-muted-foreground border-t border-border/70 pt-4">
                Mostrando {results.length} de {dentists.length} odontólogos verificados en Ica
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}
