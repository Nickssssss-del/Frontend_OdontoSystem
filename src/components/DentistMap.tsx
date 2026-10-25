import * as React from "react";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";
import type { DentistMapInnerProps } from "@/components/DentistMapInner";

export type DentistMapProps = {
  dentists: Dentist[];
  altura?: number | string | undefined;
};

/**
 * Mapa interactivo de odontólogos para el catálogo de búsqueda de pacientes.
 * Carga teselas de OpenStreetMap y pines interactivos con Leaflet.
 * Es compatible con SSR al cargarse exclusivamente en el navegador.
 */
export function DentistMap({ dentists, altura = 320 }: DentistMapProps) {
  const [ComponenteMapa, setComponenteMapa] =
    React.useState<React.ComponentType<DentistMapInnerProps> | null>(null);

  React.useEffect(() => {
    let cancelado = false;
    import("@/components/DentistMapInner")
      .then((mod) => {
        if (!cancelado) {
          setComponenteMapa(() => mod.DentistMapInner);
        }
      })
      .catch((err) => {
        console.error("No se pudo cargar el mapa de catálogo Leaflet:", err);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;

  return (
    <div className="space-y-3">
      {/* Contenedor del mapa OpenStreetMap */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: alturaEstilo }}>
        {ComponenteMapa ? (
          <ComponenteMapa dentists={dentists} altura={alturaEstilo} />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 animate-pulse text-muted-foreground"
            style={{ height: alturaEstilo }}
          >
            <MapPin className="size-7 text-primary/60 animate-bounce" />
            <span className="mt-2 text-xs font-medium">Cargando mapa interactivo de Ica...</span>
          </div>
        )}
      </div>

      {/* Tarjetas resumidas de los primeros resultados destacados */}
      {dentists.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {dentists.slice(0, 2).map((d) => (
            <Link
              key={d.id}
              to="/paciente/dentista/$id"
              params={{ id: d.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
            >
              {d.fotoUrl ? (
                <img
                  src={d.fotoUrl}
                  alt={`Foto de ${d.name}`}
                  className="size-10 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-semibold text-primary">
                  {d.initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.specialty} — {d.district} · desde {soles(d.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
