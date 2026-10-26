import * as React from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type Coordenadas = {
  lat: number;
  lng: number;
};

export type SelectorUbicacionMapaInnerProps = {
  posicion?: Coordenadas | null | undefined;
  onChange: (coordenadas: Coordenadas) => void;
  altura?: number | string | undefined;
  zoomInicial?: number | undefined;
  centroPorDefecto?: Coordenadas | undefined;
};

// Coordenadas centrales de referencia para Ica, Perú
const ICA_CENTRO: Coordenadas = { lat: -14.06777, lng: -75.72861 };

function crearIconoSeleccion() {
  const pinHtml = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: grab;">
      <div style="background: #006B68; color: #FFFFFF; width: 38px; height: 38px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0, 107, 104, 0.45), 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div style="width: 2px; height: 10px; background: #006B68; border-radius: 1px;"></div>
      <div style="width: 10px; height: 4px; background: rgba(0, 107, 104, 0.4); border-radius: 9999px; filter: blur(0.5px);"></div>
    </div>
  `;

  return L.divIcon({
    className: "selector-ubicacion-marker",
    html: pinHtml,
    iconSize: [38, 52],
    iconAnchor: [19, 52],
    popupAnchor: [0, -52],
  });
}

/**
 * Escucha clics en el mapa para colocar o mover el marcador.
 */
function ManejadorClics({ onClic }: { onClic: (coords: Coordenadas) => void }) {
  useMapEvents({
    click(e) {
      onClic({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/**
 * Centra y vuela suavemente el mapa cuando la posición cambia externamente
 * (por ejemplo al usar geolocalización o asignar coordenadas).
 */
function CentradorMapa({ destino }: { destino?: Coordenadas | null | undefined }) {
  const map = useMap();
  const destinoAnterior = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!destino) return;
    const clave = `${destino.lat.toFixed(5)},${destino.lng.toFixed(5)}`;
    if (destinoAnterior.current !== clave) {
      destinoAnterior.current = clave;
      map.flyTo([destino.lat, destino.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
    }
  }, [destino, map]);

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

export function SelectorUbicacionMapaInner({
  posicion,
  onChange,
  altura = 300,
  zoomInicial = 15,
  centroPorDefecto = ICA_CENTRO,
}: SelectorUbicacionMapaInnerProps) {
  const icono = React.useMemo(() => crearIconoSeleccion(), []);
  const centro: [number, number] = posicion
    ? [posicion.lat, posicion.lng]
    : [centroPorDefecto.lat, centroPorDefecto.lng];

  const markerRef = React.useRef<L.Marker | null>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onChange({ lat: latlng.lat, lng: latlng.lng });
        }
      },
    }),
    [onChange],
  );

  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner isolate z-0"
      style={{ height: alturaEstilo }}
    >
      <MapContainer
        center={centro}
        zoom={posicion ? zoomInicial : 14}
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

        <ManejadorClics onClic={onChange} />
        <CentradorMapa destino={posicion} />

        {posicion ? (
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[posicion.lat, posicion.lng]}
            icon={icono}
            ref={markerRef}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
