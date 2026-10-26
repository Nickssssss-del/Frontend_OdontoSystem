import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Calendar, ExternalLink, MapPin, Navigation, Star } from "lucide-react";
import type { Dentist } from "@/lib/mock-data";
import { soles } from "@/lib/mock-data";
import { COORDENADAS_DISTRITO_ICA, sinTildes } from "@/lib/odontologos";

export type DentistMapInnerProps = {
  dentists: Dentist[];
  altura?: number | string | undefined;
};

const CENTRO_ICA: [number, number] = [-14.06777, -75.72861];

/**
 * Obtiene las coordenadas geogrÃ¡ficas de un dentista.
 * Si tiene latitud y longitud reales las usa; de lo contrario calcula
 * el centro del distrito en Ica con un desplazamiento para evitar superposiciÃ³n.
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
 * Genera un marcador visual con el precio en soles o iniciales,
 * con la paleta de colores corporativa OdontoSystem (teal/menta).
 */
function crearIconoDentista(d: Dentist) {
  const etiqueta = d.price > 0 ? `S/${d.price}` : d.initials;
  const pinHtml = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
      <div style="background: #006B68; color: #FFFFFF; padding: 4px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0, 107, 104, 0.4), 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px; border: 2px solid #FFFFFF; font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 700; white-space: nowrap;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
    iconSize: [60, 36],
    iconAnchor: [30, 36],
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
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [puntos, map]);

  return null;
}

/** Fuerza invalidar el tamaño del mapa al montarse para evitar tiles grises */
function MapSizeFixer() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function DentistMapInner({ dentists, altura = 340 }: DentistMapInnerProps) {
  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;

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

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner isolate z-0"
      style={{ height: alturaEstilo }}
    >
      <MapContainer
        center={CENTRO_ICA}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapSizeFixer />
        <AjustadorLimites puntos={puntos} />

        {puntosYDentistas.map(({ dentist, coords, icon }) => {
          const urlRuta = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${coords[0]}%2C${coords[1]}`;
          return (
            <Marker key={dentist.id} position={coords} icon={icon}>
              <Popup>
                <div className="p-2 space-y-2 min-w-[210px] text-foreground font-sans">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-xs font-bold text-primary">
                      {dentist.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight truncate">{dentist.name}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-primary shrink-0" />
                        {dentist.district}
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
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
                    >
                      <Calendar className="size-3" />
                      <span>Ver horarios</span>
                    </Link>
                    <a
                      href={urlRuta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                      title="Ver ruta en OpenStreetMap"
                    >
                      <Navigation className="size-3 text-primary" />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* BrÃºjula y conteo flotante */}
      <div className="pointer-events-none absolute bottom-2 left-3 z-[1000] flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
        <Navigation className="size-3 text-primary" /> Mapa interactivo de Ica
      </div>
      <div className="pointer-events-none absolute bottom-2 right-3 z-[1000] rounded-full bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        {dentists.length} consultorios
      </div>
    </div>
  );
}
