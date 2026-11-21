import { describe, expect, it, vi } from "vitest";
import type { CitaOdontologo } from "@/lib/api";
import {
  MAX_TRAMOS_HISTORIA,
  buscarCitasSinHistoria,
  objetivoPendientes,
  tramosAgendaHaciaAtras,
} from "@/lib/citas-sin-historia";

// 21/11/2026 00:30 en Lima (05:30 UTC): el día en Lima todavía es el 21, aunque en UTC también.
const AHORA = Date.parse("2026-11-21T00:30:00-05:00");
const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";

function cita(
  id: string,
  inicio: string,
  estado: CitaOdontologo["estado"],
  paciente = P1,
): CitaOdontologo {
  return {
    id,
    estado,
    inicio,
    fin: inicio,
    zona_horaria: "America/Lima",
    precio: 95,
    deposito_requerido: 19,
    pagar_antes_de: null,
    odontologo: { id: "o1", nombre: "Manuel", consultorio: null, direccion: null, distrito: null },
    servicio: { id: "s1", titulo: "Evaluación ortodóntica" },
    paciente: { id: paciente, nombre: "Paciente" },
  } as CitaOdontologo;
}

describe("DISP02-O07: tramos de la agenda hacia atrás", () => {
  it("son de 62 días, contiguos y terminan mañana (hora de Lima)", () => {
    const tramos = tramosAgendaHaciaAtras(3, AHORA);
    expect(tramos[0]).toEqual({ desde: "2026-09-21", hasta: "2026-11-22" });
    expect(tramos[1]?.hasta).toBe(tramos[0]?.desde);
    expect(tramos[2]?.hasta).toBe(tramos[1]?.desde);
  });

  it("usa la fecha de Lima, no la de UTC, cerca de la medianoche", () => {
    // 20/11 23:30 en Lima = 21/11 04:30 UTC.
    const tramos = tramosAgendaHaciaAtras(1, Date.parse("2026-11-20T23:30:00-05:00"));
    expect(tramos[0]?.hasta).toBe("2026-11-21");
  });
});

describe("DISP02-O07: cuántas citas faltan documentar", () => {
  it("atendidas menos historias, nunca negativo", () => {
    expect(objetivoPendientes(3, 1)).toBe(2);
    expect(objetivoPendientes(1, 2)).toBe(0);
  });
  it("desconocido si falló el detalle o las historias", () => {
    expect(objetivoPendientes(undefined, 1)).toBeNull();
    expect(objetivoPendientes(3, null)).toBeNull();
  });
});

describe("DISP02-O07: búsqueda de citas atendidas sin historia", () => {
  const agenda = [
    cita("reciente", "2026-11-16T08:00:00-05:00", "COMPLETADA"),
    cita("con-historia", "2026-11-13T09:00:00-05:00", "COMPLETADA"),
    cita("confirmada", "2026-11-18T10:00:00-05:00", "CONFIRMADA"),
    cita("otro-paciente", "2026-11-17T10:00:00-05:00", "COMPLETADA", P2),
    cita("inasistencia", "2026-11-12T10:00:00-05:00", "INASISTENCIA_PENALIZADA"),
  ];

  it("devuelve solo COMPLETADAS del paciente, ya iniciadas y sin historia", async () => {
    const pedirAgenda = vi.fn().mockResolvedValue(agenda);
    const r = await buscarCitasSinHistoria(P1, {
      objetivo: 1,
      conHistoria: new Set(["con-historia"]),
      pedirAgenda,
      ahoraMs: AHORA,
    });
    expect(r.citas.map((c) => c.id)).toEqual(["reciente"]);
    expect(pedirAgenda).toHaveBeenCalledTimes(1);
    expect(pedirAgenda).toHaveBeenCalledWith("2026-09-21", "2026-11-22");
  });

  it("sigue hacia atrás si la cita es más antigua que el primer tramo", async () => {
    const antigua = cita("agosto", "2026-08-10T10:00:00-05:00", "COMPLETADA");
    const pedirAgenda = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([antigua])
      .mockResolvedValue([]);
    const r = await buscarCitasSinHistoria(P1, {
      objetivo: 1,
      conHistoria: new Set(),
      pedirAgenda,
      ahoraMs: AHORA,
    });
    expect(r.citas.map((c) => c.id)).toEqual(["agosto"]);
    expect(pedirAgenda).toHaveBeenCalledTimes(2);
    expect(r.revisadoDesde).toBe("2026-07-21");
  });

  it("no pide nada si no falta ninguna", async () => {
    const pedirAgenda = vi.fn();
    const r = await buscarCitasSinHistoria(P1, {
      objetivo: 0,
      conHistoria: new Set(),
      pedirAgenda,
      ahoraMs: AHORA,
    });
    expect(r.citas).toEqual([]);
    expect(pedirAgenda).not.toHaveBeenCalled();
  });

  it("con objetivo desconocido revisa solo el primer tramo", async () => {
    const pedirAgenda = vi.fn().mockResolvedValue([]);
    await buscarCitasSinHistoria(P1, {
      objetivo: null,
      conHistoria: new Set(),
      pedirAgenda,
      ahoraMs: AHORA,
    });
    expect(pedirAgenda).toHaveBeenCalledTimes(1);
  });

  it("se detiene en el máximo de tramos (≈ 1 año)", async () => {
    const pedirAgenda = vi.fn().mockResolvedValue([]);
    await buscarCitasSinHistoria(P1, {
      objetivo: 5,
      conHistoria: new Set(),
      pedirAgenda,
      ahoraMs: AHORA,
    });
    expect(pedirAgenda).toHaveBeenCalledTimes(MAX_TRAMOS_HISTORIA);
  });

  it("propaga el error de la agenda (la pantalla muestra el motivo y Reintentar)", async () => {
    const pedirAgenda = vi.fn().mockRejectedValue(new Error("HTTP 500"));
    await expect(
      buscarCitasSinHistoria(P1, {
        objetivo: 1,
        conHistoria: new Set(),
        pedirAgenda,
        ahoraMs: AHORA,
      }),
    ).rejects.toThrow("HTTP 500");
  });
});
