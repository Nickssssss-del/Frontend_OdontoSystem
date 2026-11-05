import * as React from "react";
import L from "leaflet";
import {
  AttributionControl,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Link } from "@tanstack/react-router";
import { Calendar, Loader2, LocateFixed, MapPin, Navigation, Star } from "lucide-react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";
import { COORDENADAS_DISTRITO_ICA, sinTildes } from "@/lib/odontologos";

type CoordenadasUsuario = { lat: number; lng: number };
type EstadoUbicacion =
  "inactivo" | "buscando" | "activo" | "denegado" | "no-disponible" | "sin-soporte";

function distanciaKm(a: CoordenadasUsuario, b: CoordenadasUsuario): number {
  const radioTierra = 6371;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const seno =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radioTierra * 2 * Math.atan2(Math.sqrt(seno), Math.sqrt(1 - seno));
}

function textoDistancia(distancia: number): string {
  return distancia < 1 ? `${Math.round(distancia * 1000)} m` : `${distancia.toFixed(1)} km`;
}

function useUbicacionUsuario() {
  const [posicion, setPosicion] = React.useState<CoordenadasUsuario | null>(null);
  const [estado, setEstado] = React.useState<EstadoUbicacion>("inactivo");

  const solicitar = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setEstado("sin-soporte");
      return;
    }
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosicion({ lat: coords.latitude, lng: coords.longitude });
        setEstado("activo");
      },
      (error) => setEstado(error.code === error.PERMISSION_DENIED ? "denegado" : "no-disponible"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  return { posicion, estado, solicitar };
}

function UbicacionUsuarioCapa({
  posicion,
  enfocar,
}: {
  posicion: CoordenadasUsuario | null;
  enfocar: number;
  puntosReferencia: [number, number][];
}) {
  const map = useMap();
  React.useEffect(() => {
    if (posicion && enfocar > 0) map.setView([posicion.lat, posicion.lng], 15);
  }, [enfocar, map, posicion]);

  if (!posicion) return null;
  return (
    <CircleMarker
      center={[posicion.lat, posicion.lng]}
      radius={8}
      pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.9, weight: 3 }}
    />
  );
}

export type DentistMapInnerProps = {
  dentists: Dentist[];
  altura?: number | string | undefined;
};

const CENTRO_ICA: [number, number] = [-14.06777, -75.72861];

/**
 * Obtiene las coordenadas geográficas de un dentista.
 * Si tiene latitud y longitud reales las usa; de lo contrario calcula
 * el centro del distrito en Ica con un desplazamiento para evitar superposición.
 */
function obtenerCoordenadas(d: Dentist, indice: number): [number, number] {
  if (
    typeof d.latitud === "number" &&
    typeof d.longitud === "number" &&
    !Number.isNaN(d.latitud) &&
    !Number.isNaN(d.longitud) &&
    d.latitud !== 0
  ) {
    return [d.latitud, d.longitud];
  }

  const base = COORDENADAS_DISTRITO_ICA[sinTildes(d.district)] ?? {
    lat: CENTRO_ICA[0],
    lng: CENTRO_ICA[1],
  };

  // Desplazamiento pseudo-aleatorio determinista para separar consultorios del mismo distrito
  const pasoLat = (((indice * 37) % 11) - 5) * 0.0022;
  const pasoLng = (((indice * 53) % 9) - 4) * 0.0024;

  return [base.lat + pasoLat, base.lng + pasoLng];
}

/**
 * Marcador con el precio en soles o iniciales, con la paleta OdontoSystem (teal/menta).
 * El icono mide 0×0 y el pin se dibuja hacia arriba desde ese punto: así la punta queda
 * exactamente sobre la coordenada sin importar cuánto mida la etiqueta ("S/90" o "S/1200").
 */
function crearIconoDentista(d: Dentist) {
  const etiqueta = d.price > 0 ? `S/${d.price}` : d.initials;
  const pinHtml = `
    <div style="position: absolute; left: 0; bottom: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; width: max-content; cursor: pointer;">
      <div style="background: #006B68; color: #FFFFFF; padding: 4px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0, 107, 104, 0.4), 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px; border: 2px solid #FFFFFF; font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>${etiqueta}</span>
      </div>
      <div style="width: 2px; height: 6px; background: #006B68;"></div>
    </div>
  `;

  return L.divIcon({
    className: "catalogo-dentist-marker",
    html: pinHtml,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  });
}

/**
 * Ajusta la vista del mapa para encuadrar todos los marcadores visibles.
 */
function AjustadorLimites({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  const puntosRef = React.useRef<string>("");

  React.useEffect(() => {
    if (puntos.length === 0) return;
    const clave = puntos.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(";");
    if (puntosRef.current === clave) return;
    puntosRef.current = clave;

    if (puntos.length === 1) {
      map.setView(puntos[0]!, 15);
    } else {
      const bounds = L.latLngBounds(puntos);
      // Más margen arriba: ahí van el zoom y el botón "Mi ubicación".
      map.fitBounds(bounds, {
        paddingTopLeft: [40, 64],
        paddingBottomRight: [40, 48],
        maxZoom: 16,
      });
    }
  }, [puntos, map]);

  return null;
}

/**
 * Recalcula el tamaño del mapa al montarse y cada vez que su contenedor cambia de tamaño
 * (girar el celular, abrir/cerrar el menú lateral, cambiar de pestaña). Sin esto quedan tiles grises.
 */
function MapSizeFixer() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    const contenedor = map.getContainer();
    let observador: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observador = new ResizeObserver(() => map.invalidateSize());
      observador.observe(contenedor);
    }
    return () => {
      clearTimeout(timer);
      observador?.disconnect();
    };
  }, [map]);
  return null;
}

const MENSAJE_ERROR: Partial<Record<EstadoUbicacion, string>> = {
  denegado:
    "Bloqueaste el permiso de ubicación. Actívalo desde el candado de la barra de direcciones y vuelve a intentar.",
  "no-disponible":
    "No pudimos obtener tu ubicación. Revisa que el GPS esté activo e inténtalo de nuevo.",
  "sin-soporte": "Tu navegador no permite obtener la ubicación (la página debe abrirse con HTTPS).",
};

export function DentistMapInner({ dentists, altura = 340 }: DentistMapInnerProps) {
  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;
  const { posicion, estado, solicitar } = useUbicacionUsuario();
  const [enfocar, setEnfocar] = React.useState(0);
  const [pendiente, setPendiente] = React.useState(false);
  const [errorVisible, setErrorVisible] = React.useState(false);

  // En pantallas táctiles el mapa no captura el arrastre de un dedo: así la página se puede
  // seguir deslizando con el dedo sobre el mapa. Con dos dedos (pellizco) sí se mueve y se acerca.
  const [tactil] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  // Tras tocar "Mi ubicación", cuando llega la primera posición se centra el mapa.
  React.useEffect(() => {
    if (pendiente && posicion) {
      setEnfocar((n) => n + 1);
      setPendiente(false);
    }
  }, [pendiente, posicion]);

  // El mensaje de error se oculta solo a los 8 s.
  React.useEffect(() => {
    if (!MENSAJE_ERROR[estado]) {
      setErrorVisible(false);
      return;
    }
    setErrorVisible(true);
    const t = setTimeout(() => setErrorVisible(false), 8000);
    return () => clearTimeout(t);
  }, [estado]);

  const alTocarUbicacion = () => {
    if (estado === "activo" && posicion) {
      setEnfocar((n) => n + 1);
      return;
    }
    setPendiente(true);
    setErrorVisible(true);
    solicitar();
  };

  const puntosYDentistas = React.useMemo(() => {
    return dentists.map((d, i) => ({
      dentist: d,
      coords: obtenerCoordenadas(d, i),
      icon: crearIconoDentista(d),
    }));
  }, [dentists]);

  const puntos = React.useMemo(
    () => puntosYDentistas.map((item) => item.coords),
    [puntosYDentistas],
  );

  const buscando = estado === "buscando";
  const mensajeError = errorVisible ? MENSAJE_ERROR[estado] : undefined;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner isolate z-0"
      style={{ height: alturaEstilo }}
    >
      <MapContainer
        center={CENTRO_ICA}
        zoom={13}
        scrollWheelZoom={false}
        dragging={!tactil}
        attributionControl={false}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Sin el prefijo "Leaflet": deja la atribución de OpenStreetMap (obligatoria) más corta en celulares. */}
        <AttributionControl prefix={false} position="bottomright" />
        <MapSizeFixer />
        <AjustadorLimites puntos={puntos} />
        <UbicacionUsuarioCapa posicion={posicion} enfocar={enfocar} puntosReferencia={puntos} />

        {puntosYDentistas.map(({ dentist, coords, icon }) => {
          const origen = posicion ? `${posicion.lat}%2C${posicion.lng}` : "";
          const urlRuta = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origen}%3B${coords[0]}%2C${coords[1]}`;
          const distancia = posicion
            ? distanciaKm(posicion, { lat: coords[0], lng: coords[1] })
            : null;
          return (
            <Marker key={dentist.id} position={coords} icon={icon}>
              <Popup maxWidth={260} minWidth={200} autoPanPadding={[24, 24]}>
                <div className="space-y-2 p-1 text-foreground font-sans">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                      {dentist.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight truncate">{dentist.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-primary shrink-0" />
                        <span className="truncate">
                          {dentist.district}
                          {distancia !== null && ` · a ${textoDistancia(distancia)} de ti`}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-y border-border/70 py-1.5 my-1">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Star className="size-3.5 fill-warning text-warning" />
                      {dentist.rating > 0 ? dentist.rating.toFixed(1) : "Nuevo"}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({dentist.reviews})
                      </span>
                    </span>
                    <span className="font-semibold text-primary">desde {soles(dentist.price)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to="/paciente/dentista/$id"
                      params={{ id: dentist.id }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg !text-primary-foreground bg-primary px-2.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
                    >
                      <Calendar className="size-3" />
                      <span>Ver horarios</span>
                    </Link>
                    <a
                      href={urlRuta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title={
                        posicion ? "Cómo llegar desde tu ubicación" : "Ver ruta en OpenStreetMap"
                      }
                      aria-label="Cómo llegar"
                    >
                      <Navigation className="size-3.5 text-primary" />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Botón "Mi ubicación" (arriba a la derecha; el zoom de Leaflet va arriba a la izquierda). */}
      <div className="absolute right-3 top-3 z-[1000] flex max-w-[calc(100%-5rem)] flex-col items-end gap-2">
        <button
          type="button"
          onClick={alTocarUbicacion}
          disabled={buscando}
          aria-label={
            estado === "activo" ? "Centrar el mapa en mi ubicación" : "Mostrar mi ubicación"
          }
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur transition-colors hover:bg-background disabled:cursor-wait disabled:opacity-80"
        >
          {buscando ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : (
            <LocateFixed
              className={`size-4 ${estado === "activo" ? "text-blue-600" : "text-primary"}`}
            />
          )}
          <span>
            {buscando ? "Buscando…" : estado === "activo" ? "Centrar en mí" : "Mi ubicación"}
          </span>
        </button>
        {mensajeError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-background/95 px-3 py-2 text-[11px] leading-snug text-foreground shadow-md backdrop-blur"
          >
            {mensajeError}
          </p>
        )}
      </div>

      {/* Conteo flotante abajo a la izquierda: la derecha se deja libre para la atribución de OpenStreetMap. */}
      <div className="pointer-events-none absolute bottom-2 left-3 z-[1000] max-w-[50%] truncate rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
        {dentists.length} {dentists.length === 1 ? "consultorio" : "consultorios"}
        <span className="hidden sm:inline"> · Mapa de Ica</span>
        {tactil && <span className="text-muted-foreground"> · usa 2 dedos</span>}
      </div>
    </div>
  );
}
