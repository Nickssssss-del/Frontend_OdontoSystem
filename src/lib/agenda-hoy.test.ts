import { describe, expect, it } from "vitest";
import type { AgendaHoy } from "@/lib/api";
import { estadoAgendaHoy } from "@/lib/agenda-hoy";

/** Simula la respuesta real: JSON sin los campos nulos. */
function desdeJson(json: string): AgendaHoy {
  return JSON.parse(json) as AgendaHoy;
}

describe("DEF-12: estado de «¿Atiendes hoy?»", () => {
  it("sin el campo atiende (el backend omite los nulos) queda «sin confirmar»", () => {
    const hoy = desdeJson('{"fecha":"2026-11-23","citas_hoy":2,"citas_canceladas":0}');
    expect(hoy.atiende).toBeUndefined();
    expect(estadoAgendaHoy(hoy)).toBe("sin-confirmar");
  });

  it("también acepta atiende: null", () => {
    expect(estadoAgendaHoy({ atiende: null })).toBe("sin-confirmar");
  });

  it("true y false se respetan", () => {
    expect(estadoAgendaHoy({ atiende: true })).toBe("atiende");
    expect(estadoAgendaHoy({ atiende: false })).toBe("no-atiende");
  });
});
