import * as React from "react";

export type PosicionUsuario = {
  lat: number;
  lng: number;
  /** Precisión en metros que reporta el navegador. */
  precision: number;
};

export type EstadoUbicacion =
  | "inactivo" // todavía no se pidió
  | "buscando" // esperando el primer dato
  | "activo" // hay posición
  | "denegado" // el usuario negó el permiso
  | "no-disponible" // el dispositivo no pudo obtenerla
  | "sin-soporte"; // navegador sin geolocalización o página sin HTTPS

/** Distancia en km entre dos puntos (fórmula de haversine). */
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "850 m" o "2.4 km". */
export function textoDistancia(km: number): string {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`;
}

/**
 * Ubicación del usuario con su permiso. No pide nada al cargar la página: el navegador solo muestra
 * el aviso cuando el usuario toca "Mi ubicación" (`solicitar`). Si ya había dado permiso antes,
 * empieza sola, sin aviso. Es segura para SSR: solo toca `navigator` dentro de efectos y eventos.
 */
export function useUbicacionUsuario() {
  const [posicion, setPosicion] = React.useState<PosicionUsuario | null>(null);
  const [estado, setEstado] = React.useState<EstadoUbicacion>("inactivo");
  const watchId = React.useRef<number | null>(null);

  const detener = React.useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  const solicitar = React.useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setEstado("sin-soporte");
      return;
    }
    if (watchId.current !== null) {
      // Ya está siguiendo: solo se refleja que se vuelve a intentar.
      setEstado((previo) => (previo === "activo" ? previo : "buscando"));
      return;
    }
    setEstado("buscando");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosicion({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precision: p.coords.accuracy,
        });
        setEstado("activo");
      },
      (err) => {
        // Si ya teníamos una posición, un fallo puntual no debe borrarla.
        if (err.code === err.PERMISSION_DENIED) {
          detener();
          setPosicion(null);
          setEstado("denegado");
        } else {
          setEstado((previo) => (previo === "activo" ? previo : "no-disponible"));
        }
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    );
  }, [detener]);

  // Si el permiso ya estaba concedido, arranca sin molestar.
  React.useEffect(() => {
    let vivo = true;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((r) => {
          if (vivo && r.state === "granted") solicitar();
        })
        .catch(() => {});
    }
    return () => {
      vivo = false;
      detener();
    };
  }, [solicitar, detener]);

  return { posicion, estado, solicitar, detener };
}
