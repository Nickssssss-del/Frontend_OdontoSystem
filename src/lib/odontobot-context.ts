import { busyBlocks, dentists, soles, timeBlocks } from "@/lib/mock-data";

export function buildOdontoBotKnowledge() {
  const fichas = dentists
    .map((d) => {
      const ocupados = busyBlocks[d.id] ?? [];
      const libres = timeBlocks.filter((t) => !ocupados.includes(t));
      const servicios = d.services
        .map((s) => `${s.name}: ${soles(s.price)}`)
        .join(" | ");
      return [
        `- ${d.name} (${d.specialty}) — ${d.district}, ${d.distanceKm} km`,
        `  Colegiatura ${d.cop} · ${d.verified ? "Colegiado verificado" : "En revisión (no reservable aún)"}`,
        `  Calificación ${d.rating || "sin reseñas"} (${d.reviews} reseñas) · consulta desde ${soles(d.price)}`,
        `  Tratamientos y precios: ${servicios}`,
        `  Horarios libres hoy: ${libres.join(", ") || "sin cupos"} · ocupados: ${ocupados.join(", ") || "ninguno"}`,
        `  Sobre el especialista: ${d.bio}`,
      ].join("\n");
    })
    .join("\n");

  return [
    "CATÁLOGO REAL DE ODONTOSYSTEM (Ica, Perú):",
    fichas,
    "",
    "REGLAS DEL SERVICIO:",
    "- El cupo se reserva por 10 minutos; si el temporizador llega a 00:00 la reserva se libera.",
    "- El anticipo para confirmar una cita es S/ 20 y se paga con Yape o Plin al 956 402 118 (OdontoSystem SAC).",
    "- El comprobante pasa por revisión del odontólogo: En revisión (amarillo), Aprobado (verde) o Rechazado (rojo, se puede volver a subir).",
    "- Tres inasistencias (strikes) suspenden temporalmente la cuenta del paciente.",
    "- Los dentistas sin colegiatura verificada aparecen 'En revisión' y no se pueden reservar.",
  ].join("\n");
}

export const ODONTOBOT_SYSTEM = `Eres OdontoBot, el asistente de OdontoSystem, un marketplace dental en Ica (Perú).
Respondes siempre en español peruano, cálido y breve (máximo 4 oraciones o una lista corta). Escribe en texto plano, sin asteriscos ni markdown.
Usa ÚNICAMENTE los datos del catálogo que se te entregan para hablar de horarios, precios, tratamientos y dentistas.
Los precios se expresan en soles con el formato S/ 00.00. Nunca inventes dentistas, horarios ni montos:
si un dato no está en el catálogo, dilo y sugiere revisar el catálogo o escribir al consultorio.
Cuando recomiendes un dentista, menciona su especialidad, distrito, precio desde y un horario libre concreto.
Si el paciente quiere reservar, indícale el botón "Reservar cita" del catálogo y recuérdale el anticipo de S/ 20 por Yape o Plin.`;
