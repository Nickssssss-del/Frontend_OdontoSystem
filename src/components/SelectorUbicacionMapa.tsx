import * as React from "react";
import { Compass, Info, LocateFixed, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  Coordenadas,
  SelectorUbicacionMapaInnerProps,
} from "@/components/SelectorUbicacionMapaInner";

export type SelectorUbicacionMapaProps = {
  latitud?: number | null | undefined;
  longitud?: number | null | undefined;
  onChange: (coordenadas: Coordenadas | null) => void;
  altura?: number | string | undefined;
  className?: string | undefined;
};

function esCoordenadaValida(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Componente interactivo para que el odontólogo seleccione o ajuste las coordenadas
 * de su consultorio en OpenStreetMap haciendo clic o arrastrando el marcador.
 * Es compatible con SSR al cargar Leaflet únicamente en el cliente.
 */
export function SelectorUbicacionMapa({
  latitud,
  longitud,
  onChange,
  altura = 300,
  className,
}: SelectorUbicacionMapaProps) {
  const [obteniendoGPS, setObteniendoGPS] = React.useState(false);

  // Carga diferida del componente con Leaflet para evitar ReferenceError en SSR
  const [ComponenteMapa, setComponenteMapa] =
    React.useState<React.ComponentType<SelectorUbicacionMapaInnerProps> | null>(null);

  React.useEffect(() => {
    let cancelado = false;
    import("@/components/SelectorUbicacionMapaInner")
      .then((mod) => {
        if (!cancelado) {
          setComponenteMapa(() => mod.SelectorUbicacionMapaInner);
        }
      })
      .catch((err) => {
        console.error("No se pudo cargar el selector de ubicación de Leaflet:", err);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const tieneCoordenadas = esCoordenadaValida(latitud, longitud);
  const posicion: Coordenadas | null =
    tieneCoordenadas && latitud != null && longitud != null
      ? { lat: latitud, lng: longitud }
      : null;

  const usarUbicacionActual = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalización no soportada", {
        description: "Tu navegador no permite obtener la ubicación GPS.",
      });
      return;
    }

    setObteniendoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObteniendoGPS(false);
        const nuevasCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        onChange(nuevasCoords);
        toast.success("Ubicación actual detectada", {
          description: "Se colocó el marcador en tu posición GPS actual.",
        });
      },
      (error) => {
        setObteniendoGPS(false);
        let mensaje = "No se pudo obtener tu ubicación actual.";
        if (error.code === error.PERMISSION_DENIED) {
          mensaje = "Permiso denegado para acceder a tu ubicación GPS.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          mensaje = "La señal GPS no está disponible en este momento.";
        } else if (error.code === error.TIMEOUT) {
          mensaje = "Tiempo de espera agotado al consultar el GPS.";
        }
        toast.error("Error de geolocalización", { description: mensaje });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const limpiarUbicacion = () => {
    onChange(null);
    toast.info("Ubicación eliminada", {
      description: "El consultorio quedará sin coordenadas GPS registradas.",
    });
  };

  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Barra de herramientas superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-primary" />
          {posicion ? (
            <span className="font-mono text-foreground font-semibold">
              {posicion.lat.toFixed(5)}, {posicion.lng.toFixed(5)}
            </span>
          ) : (
            <span className="italic text-muted-foreground">
              Ninguna ubicación fijada en el mapa
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={usarUbicacionActual}
            disabled={obteniendoGPS}
            className="h-8 gap-1.5 rounded-full border-border bg-background px-3 text-xs font-medium hover:bg-muted/80 shadow-2xs"
          >
            {obteniendoGPS ? (
              <Compass className="size-3.5 animate-spin text-primary" />
            ) : (
              <LocateFixed className="size-3.5 text-primary" />
            )}
            <span>{obteniendoGPS ? "Obteniendo GPS..." : "Usar mi ubicación actual"}</span>
          </Button>

          {posicion ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limpiarUbicacion}
              className="h-8 gap-1.5 rounded-full px-2.5 text-xs text-destructive hover:bg-destructive/10"
              title="Quitar ubicación GPS"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Quitar</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Contenedor del mapa interactivo */}
      <div className="relative" style={{ height: alturaEstilo }}>
        {ComponenteMapa ? (
          <ComponenteMapa
            posicion={posicion}
            onChange={(coords) => {
              onChange({
                lat: Number(coords.lat.toFixed(6)),
                lng: Number(coords.lng.toFixed(6)),
              });
            }}
            altura={alturaEstilo}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 animate-pulse text-muted-foreground"
            style={{ height: alturaEstilo }}
          >
            <MapPin className="size-6 text-primary/60 animate-bounce" />
            <span className="mt-2 text-xs font-medium">Cargando selector de ubicación...</span>
          </div>
        )}
      </div>

      {/* Ayuda contextual */}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground leading-normal">
        <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Haz clic sobre el mapa para fijar la posición de tu consultorio o arrastra el marcador
          para ajustar con precisión.
        </span>
      </p>
    </div>
  );
}
