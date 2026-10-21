import * as React from "react";
import { ExternalLink, MapPin, MapPinOff, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MapaConsultorioInnerProps } from "@/components/MapaConsultorioInner";

export type MapaConsultorioProps = {
  latitud?: number | null | undefined;
  longitud?: number | null | undefined;
  nombreConsultorio?: string | null | undefined;
  direccion?: string | null | undefined;
  distrito?: string | null | undefined;
  altura?: number | string | undefined;
  zoom?: number | undefined;
  mostrarBotonRuta?: boolean | undefined;
  mostrarDetalles?: boolean | undefined;
  className?: string | undefined;
};

/**
 * Valida si las coordenadas corresponden a valores numéricos geográficamente válidos.
 * No acepta nulos, indefinidos, NaN ni el punto neutro [0, 0].
 */
function esCoordenadaValida(lat?: number | null, lng?: number | null): lat is number {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Genera la URL de OpenStreetMap para calcular la ruta hacia el consultorio (destino real).
 */
function obtenerUrlRutaOSM(lat: number, lng: number): string {
  // OSRM con destino predefinido (route=;lat,lon deja origen abierto para que el usuario use su ubicación)
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${encodeURIComponent(`${lat},${lng}`)}`;
}

/**
 * Genera la URL para ver el punto exacto con marcador en OpenStreetMap.
 */
function obtenerUrlPuntoOSM(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

/**
 * Componente reutilizable MapaConsultorio.
 *
 * Muestra un mapa interactivo con OpenStreetMap y Leaflet cuando existen coordenadas reales.
 * Si no hay coordenadas registradas, muestra un mensaje claro sin inventar datos simulados.
 * Es seguro para SSR (TanStack Start / Nitro) cargando Leaflet exclusivamente en el cliente.
 */
export function MapaConsultorio({
  latitud,
  longitud,
  nombreConsultorio,
  direccion,
  distrito,
  altura = 260,
  zoom = 15,
  mostrarBotonRuta = true,
  mostrarDetalles = true,
  className,
}: MapaConsultorioProps) {
  const tieneUbicacion =
    esCoordenadaValida(latitud, longitud) && esCoordenadaValida(longitud, latitud);

  // Carga dinámica de Leaflet solo en el navegador para evitar ReferenceError: window is not defined en SSR
  const [ComponenteMapa, setComponenteMapa] =
    React.useState<React.ComponentType<MapaConsultorioInnerProps> | null>(null);

  React.useEffect(() => {
    if (!tieneUbicacion) return;

    let cancelado = false;

    import("@/components/MapaConsultorioInner")
      .then((mod) => {
        if (!cancelado) {
          setComponenteMapa(() => mod.MapaConsultorioInner);
        }
      })
      .catch((err) => {
        console.error("No se pudo cargar el módulo del mapa Leaflet:", err);
      });

    return () => {
      cancelado = true;
    };
  }, [tieneUbicacion]);

  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;
  const direccionCompleta = [direccion, distrito].filter(Boolean).join(" · ");

  // Caso: Sin coordenadas válidas registradas en el backend
  if (!tieneUbicacion) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground",
          className,
        )}
        style={{ minHeight: alturaEstilo }}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/80">
          <MapPinOff className="size-6 text-muted-foreground" />
        </div>
        <h4 className="mt-3 font-display text-sm font-semibold text-foreground">
          Ubicación geográfica no registrada
        </h4>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          El consultorio aún no cuenta con coordenadas GPS configuradas.
        </p>
        {direccionCompleta && (
          <p className="mt-2.5 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-foreground">
            <MapPin className="size-3 text-primary shrink-0" />
            <span className="truncate">{direccionCompleta}</span>
          </p>
        )}
      </div>
    );
  }

  // Coordenadas válidas reales aseguradas por TypeScript
  const latReal = latitud;
  const lngReal = longitud;
  const urlRuta = obtenerUrlRutaOSM(latReal, lngReal);
  const urlPunto = obtenerUrlPuntoOSM(latReal, lngReal);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative" style={{ height: alturaEstilo }}>
        {ComponenteMapa ? (
          <ComponenteMapa
            latitud={latReal}
            longitud={lngReal}
            nombreConsultorio={nombreConsultorio}
            direccion={direccion}
            distrito={distrito}
            altura={alturaEstilo}
            zoom={zoom}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 animate-pulse text-muted-foreground"
            style={{ height: alturaEstilo }}
          >
            <MapPin className="size-6 text-primary/60 animate-bounce" />
            <span className="mt-2 text-xs font-medium">Cargando mapa interactivo...</span>
          </div>
        )}
      </div>

      {/* Barra de información y acción «Ver ruta» */}
      {(mostrarDetalles || mostrarBotonRuta) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {mostrarDetalles && (
            <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="truncate">
                {direccionCompleta || `${latReal.toFixed(5)}, ${lngReal.toFixed(5)}`}
              </span>
            </div>
          )}

          {mostrarBotonRuta && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-border bg-background px-3 text-xs font-medium hover:bg-muted/80 shadow-xs"
              >
                <a
                  href={urlRuta}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir indicaciones en OpenStreetMap"
                >
                  <Navigation className="size-3.5 text-primary" />
                  <span>Ver ruta</span>
                  <ExternalLink className="size-3 text-muted-foreground opacity-60" />
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
