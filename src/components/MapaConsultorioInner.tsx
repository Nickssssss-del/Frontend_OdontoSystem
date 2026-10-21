import * as React from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MapaConsultorioInnerProps = {
  latitud: number;
  longitud: number;
  nombreConsultorio?: string | null | undefined;
  direccion?: string | null | undefined;
  distrito?: string | null | undefined;
  altura?: number | string | undefined;
  zoom?: number | undefined;
};

/**
 * Ícono de marcador personalizado de alta resolución con estilo del diseño OdontoSystem (teal/menta).
 * Usa L.divIcon para evitar problemas de rutas relativas de imágenes en empaquetadores como Vite.
 */
function crearIconoMarcador(titulo: string) {
  const pinHtml = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;" title="${titulo.replace(/"/g, "&quot;")}">
      <div style="background: #006B68; color: #FFFFFF; width: 34px; height: 34px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0, 107, 104, 0.4), 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; border: 2.5px solid #FFFFFF;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div style="width: 2px; height: 8px; background: #006B68; border-radius: 1px;"></div>
      <div style="width: 8px; height: 3px; background: rgba(0, 107, 104, 0.35); border-radius: 9999px; filter: blur(0.5px);"></div>
    </div>
  `;

  return L.divIcon({
    className: "odontosystem-leaflet-marker",
    html: pinHtml,
    iconSize: [34, 45],
    iconAnchor: [17, 45],
    popupAnchor: [0, -45],
  });
}

/**
 * Componente interno que renderiza react-leaflet del lado del cliente.
 */
export function MapaConsultorioInner({
  latitud,
  longitud,
  nombreConsultorio,
  direccion,
  distrito,
  altura = 260,
  zoom = 15,
}: MapaConsultorioInnerProps) {
  const posicion: [number, number] = [latitud, longitud];
  const titulo = nombreConsultorio || "Consultorio odontológico";
  const icono = React.useMemo(() => crearIconoMarcador(titulo), [titulo]);

  const alturaEstilo = typeof altura === "number" ? `${altura}px` : altura;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner isolate z-0"
      style={{ height: alturaEstilo }}
    >
      <MapContainer
        center={posicion}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker position={posicion} icon={icono}>
          <Popup>
            <div className="p-1 text-xs">
              <p className="font-semibold text-foreground text-sm">{titulo}</p>
              {direccion ? <p className="text-muted-foreground mt-0.5">{direccion}</p> : null}
              {distrito ? <p className="text-muted-foreground/80">{distrito}</p> : null}
              <p className="text-[11px] text-primary font-mono mt-1">
                {latitud.toFixed(5)}, {longitud.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
