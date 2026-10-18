import { ApiError } from "@/lib/api";

/** Mensaje legible para mostrar en un toast o en pantalla. */
export const mensajeDe = (e: unknown, defecto = "Ocurrió un error inesperado.") =>
  e instanceof ApiError ? e.message : defecto;

const ZONA = "America/Lima";

export const fechaHora = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: ZONA,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

export const soloFecha = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: iso.length === 10 ? "UTC" : ZONA,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

export const soles = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(n ?? 0);
