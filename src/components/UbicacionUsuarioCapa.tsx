import * as React from "react";
import L from "leaflet";
import { Circle, Marker, Popup, useMap } from "react-leaflet";

type PosicionUsuario = {
  lat: number;
  lng: number;
  precision: number;
};

/** Punto azul con pulso (estilo "Mi ubicación"). Las clases viven en styles.css. */
const ICONO_USUARIO = L.divIcon({
  className: "ubicacion-usuario-marker",
  html: '<span class="ubicacion-usuario-pulso"></span><span class="ubicacion-usuario-punto"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

/** Por encima de esta precisión el círculo cubriría media ciudad: no se dibuja. */
const PRECISION_MAX_CIRCULO_M = 3000;

type Props = {
  posicion: PosicionUsuario | null;
  /** Cada vez que sube este número, el mapa se centra en el usuario. */
  enfocar: number;
  /** Puntos a encuadrar junto con el usuario cuando está lejos de ellos. */
  puntosReferencia?: [number, number][];
};

/**
 * Dibuja la ubicación del usuario dentro de un MapContainer y la encuadra cuando se pide.
 * Si el usuario está cerca de los puntos, se acerca a él; si está lejos (otra ciudad), muestra
 * a ambos para que el punto no quede fuera de la vista sin que se note.
 */
export function UbicacionUsuarioCapa({ posicion, enfocar, puntosReferencia = [] }: Props) {
  const map = useMap();
  const ultimoEnfoque = React.useRef(enfocar);
  const refs = React.useRef(puntosReferencia);
  refs.current = puntosReferencia;

  React.useEffect(() => {
    if (!posicion || ultimoEnfoque.current === enfocar) return;
    ultimoEnfoque.current = enfocar;
    const usuario: [number, number] = [posicion.lat, posicion.lng];
    const lejos =
      refs.current.length > 0 && refs.current.every((p) => map.distance(usuario, p) > 30_000);
    if (lejos) {
      map.fitBounds(L.latLngBounds([usuario, ...refs.current]), {
        paddingTopLeft: [40, 64],
        paddingBottomRight: [40, 48],
        maxZoom: 16,
      });
    } else {
      map.flyTo(usuario, Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
  }, [enfocar, posicion, map]);

  if (!posicion) return null;
  const centro: [number, number] = [posicion.lat, posicion.lng];
  return (
    <>
      {posicion.precision <= PRECISION_MAX_CIRCULO_M && (
        <Circle
          center={centro}
          radius={Math.max(posicion.precision, 10)}
          interactive={false}
          pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#2563eb", fillOpacity: 0.12 }}
        />
      )}
      <Marker position={centro} icon={ICONO_USUARIO} zIndexOffset={1000} keyboard={false}>
        <Popup>
          <div className="text-xs">
            <p className="text-sm font-semibold text-foreground">Estás aquí</p>
            <p className="text-muted-foreground">
              Precisión aproximada: {Math.round(posicion.precision)} m
            </p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
