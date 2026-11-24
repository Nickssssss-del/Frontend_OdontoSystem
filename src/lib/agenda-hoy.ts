import type { AgendaHoy } from "@/lib/api";

export type EstadoAgendaHoy = "sin-confirmar" | "atiende" | "no-atiende";

/**
 * DEF-12: el backend no envía los campos nulos (`spring.jackson.default-property-inclusion=non_null`),
 * así que «sin confirmar» llega sin `atiende` (undefined), no como `null`.
 * Comparar con `=== null` ocultaba «Sí, atiendo hoy» y la etiqueta «Sin confirmar».
 */
export function estadoAgendaHoy(hoy: Pick<AgendaHoy, "atiende">): EstadoAgendaHoy {
  if (hoy.atiende === true) return "atiende";
  if (hoy.atiende === false) return "no-atiende";
  return "sin-confirmar";
}
