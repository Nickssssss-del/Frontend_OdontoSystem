import { describe, expect, it } from "vitest";
import { ApiError, rutaHistoriasDePaciente } from "@/lib/api";
import { detalleDeError } from "@/components/perfil/perfilUtils";
import type { Appointment } from "@/lib/app-state-types";
import {
  accionesDeCita,
  cuerpoHistoria,
  decisionInasistencia,
  decidirEnvioHistoria,
  efectoRespuestaHistoria,
  erroresHistoria,
  estadoTrasOperacion,
  fusionarCita,
  historiaQuedoRegistrada,
  inasistenciaDisponibleDesde,
  liberarOperacion,
  mensajeTransicion,
  reservarOperacion,
  TOLERANCIA_INASISTENCIA_MIN,
} from "@/lib/atencion-cita";
import {
  agruparPacientesPorId,
  clasificarConsultaHistorias,
  estadoListaHistorias,
  historiaConsultable,
  historiasDelPaciente,
  idPacienteConsultable,
  reducirConsultas,
} from "@/lib/historias-clinicas";
import {
  destinoLegacyOdontologo,
  menuSoloRutasDentist,
  RUTAS_MENU_DENTISTA,
} from "@/lib/nav-dentista";

const AHORA = Date.parse("2026-11-15T15:00:00-05:00");
const PASADA = "2026-11-15T14:00:00-05:00";
const FUTURA = "2026-11-15T16:00:00-05:00";

function cita(parcial: Partial<Appointment> & Pick<Appointment, "id" | "status">): Appointment {
  return {
    dentistId: "dent-1",
    patient: "Ana",
    date: "2026-11-15",
    time: "14:00",
    inicio: PASADA,
    service: "Limpieza",
    amount: 80,
    ...parcial,
  };
}

describe("agenda: tolerancia de inasistencia (igual que el backend)", () => {
  const base = {
    status: "CONFIRMED" as const,
    historiaRegistrada: false,
    historiaCerrada: false,
    puedeComprobarHistoria: true,
  };

  it("a los 10 min del inicio permite «Atendida» pero todavía no «Inasistencia»", () => {
    const acciones = accionesDeCita({
      ...base,
      inicioIso: "2026-11-15T14:50:00-05:00",
      ahoraMs: AHORA,
    });
    expect(acciones.atender).toBe(true);
    expect(acciones.inasistencia).toBe(false);
  });

  it("justo a los 15 min del inicio permite «Inasistencia»", () => {
    const acciones = accionesDeCita({
      ...base,
      inicioIso: "2026-11-15T14:45:00-05:00",
      ahoraMs: AHORA,
    });
    expect(acciones.inasistencia).toBe(true);
  });

  it("inasistenciaDisponibleDesde suma 15 min al inicio", () => {
    expect(inasistenciaDisponibleDesde("2026-11-15T14:50:00-05:00")).toBe(
      Date.parse("2026-11-15T15:05:00-05:00"),
    );
    expect(TOLERANCIA_INASISTENCIA_MIN).toBe(15);
  });
});

describe("agenda: acciones de atención", () => {
  it("una cita CONFIRMADA cuya hora ya llegó permite atendida e inasistencia", () => {
    const acciones = accionesDeCita({
      status: "CONFIRMED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(true);
    expect(acciones.inasistencia).toBe(true);
    expect(acciones.registrarHistoria).toBe(false);
  });

  it("una cita futura no permite acciones antes de tiempo", () => {
    const acciones = accionesDeCita({
      status: "CONFIRMED",
      inicioIso: FUTURA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
  });

  it("una cita COMPLETADA no vuelve a marcarse como atendida y sí permite historia", () => {
    const acciones = accionesDeCita({
      status: "COMPLETED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
    expect(acciones.registrarHistoria).toBe(true);
  });

  it("una cita cancelada no permite inasistencia ni atención", () => {
    const acciones = accionesDeCita({
      status: "CANCELLED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
    expect(acciones.registrarHistoria).toBe(false);
  });

  it("una inasistencia ya registrada no se repite", () => {
    const acciones = accionesDeCita({
      status: "NO_SHOW",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
  });

  it("una respuesta fallida no cambia el estado visual", () => {
    expect(estadoTrasOperacion("CONFIRMED", null)).toBe("CONFIRMED");
    const lista = [cita({ id: "c1", status: "CONFIRMED" })];
    expect(fusionarCita(lista, null, "c1")).toEqual(lista);
    expect(fusionarCita(lista, null, "c1")[0]?.status).toBe("CONFIRMED");
  });

  it("una respuesta exitosa reemplaza solo esa cita", () => {
    const lista = [
      cita({ id: "c1", status: "CONFIRMED" }),
      cita({ id: "c2", status: "CONFIRMED" }),
    ];
    const actualizada = cita({ id: "c1", status: "COMPLETED" });
    const siguiente = fusionarCita(lista, actualizada, "c1");
    expect(siguiente[0]?.status).toBe("COMPLETED");
    expect(siguiente[1]?.status).toBe("CONFIRMED");
    expect(estadoTrasOperacion("CONFIRMED", "COMPLETED")).toBe("COMPLETED");
  });

  it("no reserva dos veces la misma cita mientras la solicitud sigue en curso", () => {
    const enCurso = new Set<string>();
    expect(reservarOperacion(enCurso, "c1")).toBe(true);
    expect(reservarOperacion(enCurso, "c1")).toBe(false);
    expect(enCurso.size).toBe(1);
    liberarOperacion(enCurso, "c1");
    expect(reservarOperacion(enCurso, "c1")).toBe(true);
  });
});

describe("historia clínica", () => {
  it("arma el cuerpo con diagnóstico y tratamiento válidos", () => {
    const resultado = cuerpoHistoria("  Caries  ", " Resina ");
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.cuerpo).toEqual({ diagnostico: "Caries", tratamiento: "Resina" });
    }
  });

  it("no permite diagnóstico vacío", () => {
    expect(erroresHistoria("  ", "Resina")?.diagnostico).toBeTruthy();
    expect(cuerpoHistoria("", "Resina").ok).toBe(false);
  });

  it("no permite tratamiento vacío", () => {
    expect(erroresHistoria("Caries", " ")?.tratamiento).toBeTruthy();
    expect(cuerpoHistoria("Caries", "").ok).toBe(false);
  });

  it("no arma el POST si diagnóstico, tratamiento o notas superan los 4000 caracteres", () => {
    const largo = "a".repeat(4001);
    expect(erroresHistoria(largo, "Resina")?.diagnostico).toMatch(/4000/);
    expect(erroresHistoria("Caries", largo)?.tratamiento).toMatch(/4000/);
    expect(erroresHistoria("Caries", "Resina", largo)?.notas).toMatch(/4000/);
    expect(cuerpoHistoria(largo, "Resina").ok).toBe(false);
    expect(cuerpoHistoria("Caries", "Resina", largo).ok).toBe(false);
    expect(cuerpoHistoria("a".repeat(4000), "b".repeat(4000)).ok).toBe(true);
  });

  it("no marca la historia como registrada si la petición falla", () => {
    expect(historiaQuedoRegistrada(false)).toBe(false);
    expect(historiaQuedoRegistrada(true)).toBe(true);
    const acciones = accionesDeCita({
      status: "COMPLETED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.registrarHistoria).toBe(true);
  });

  it("oculta el registro cuando el backend ya confirmó la historia", () => {
    const acciones = accionesDeCita({
      status: "COMPLETED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: true,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.registrarHistoria).toBe(false);
  });
});

describe("pacientes: historial", () => {
  it("consulta con el parámetro paciente_id del paciente seleccionado", () => {
    expect(rutaHistoriasDePaciente("pac-1")).toBe(
      "/api/odontologos/yo/historias?paciente_id=pac-1",
    );
  });

  it("no mezcla historias de distintos pacientes", () => {
    const deAna = historiasDelPaciente(
      { pacienteId: "ana", historias: [{ id: 1, diagnostico: "Caries" }] },
      "ana",
    );
    const deLuis = historiasDelPaciente(
      { pacienteId: "ana", historias: [{ id: 1, diagnostico: "Caries" }] },
      "luis",
    );
    expect(deAna).toHaveLength(1);
    expect(deLuis).toEqual([]);
    expect(rutaHistoriasDePaciente("luis")).not.toContain("ana");
  });

  it("muestra vacío, carga y error por separado", () => {
    expect(estadoListaHistorias({ cargando: true, error: null, total: 0 })).toBe("cargando");
    expect(estadoListaHistorias({ cargando: false, error: "falló", total: 0 })).toBe("error");
    expect(estadoListaHistorias({ cargando: false, error: null, total: 0 })).toBe("vacio");
    expect(estadoListaHistorias({ cargando: false, error: null, total: 2 })).toBe("lista");
  });
});

describe("navegación", () => {
  it("redirige /odontologo al dashboard y no entra en bucle", () => {
    expect(destinoLegacyOdontologo("/odontologo")).toBe("/dentist/dashboard");
    expect(destinoLegacyOdontologo("/odontologo/")).toBe("/dentist/dashboard");
    expect(destinoLegacyOdontologo("/dentist/dashboard")).toBeNull();
    expect(destinoLegacyOdontologo("/odontologo/configuracion")).toBeNull();
  });

  it("el menú solo usa rutas del módulo /dentist", () => {
    expect(menuSoloRutasDentist(RUTAS_MENU_DENTISTA)).toBe(true);
    expect(RUTAS_MENU_DENTISTA).not.toContain("/odontologo");
  });
});

describe("formulario de historia clínica", () => {
  const post = (citaId: string, cuerpo: unknown) => ({ citaId, cuerpo });

  it("no arma el POST si el diagnóstico está vacío", () => {
    const decision = decidirEnvioHistoria({
      diagnostico: "  ",
      tratamiento: "Resina",
      enviando: false,
    });
    expect(decision.tipo).toBe("validacion");
    expect(decision.tipo === "validacion" && decision.errores.diagnostico).toBeTruthy();
  });

  it("no arma el POST si el tratamiento está vacío", () => {
    const decision = decidirEnvioHistoria({
      diagnostico: "Caries",
      tratamiento: "",
      enviando: false,
    });
    expect(decision.tipo).toBe("validacion");
  });

  it("con datos válidos prepara el POST del id de la cita", () => {
    const decision = decidirEnvioHistoria({
      diagnostico: " Caries ",
      tratamiento: " Resina ",
      enviando: false,
    });
    expect(decision.tipo).toBe("enviar");
    if (decision.tipo === "enviar") {
      expect(post("cita-9", decision.cuerpo)).toEqual({
        citaId: "cita-9",
        cuerpo: { diagnostico: "Caries", tratamiento: "Resina" },
      });
    }
  });

  it("una respuesta exitosa marca la historia como registrada", () => {
    expect(efectoRespuestaHistoria("ok")).toEqual({
      mostrarComoRegistrada: true,
      cerrar: true,
      puedeReintentar: false,
    });
  });

  it("un 409 no muestra Historia registrada", () => {
    const efecto = efectoRespuestaHistoria(409);
    expect(efecto.mostrarComoRegistrada).toBe(false);
    expect(efecto.puedeReintentar).toBe(false);
  });

  it("un 500 deja el formulario listo para reintentar", () => {
    expect(efectoRespuestaHistoria("error")).toEqual({
      mostrarComoRegistrada: false,
      cerrar: false,
      puedeReintentar: true,
    });
  });

  it("un envío en curso no prepara otro POST", () => {
    expect(
      decidirEnvioHistoria({ diagnostico: "Caries", tratamiento: "Resina", enviando: true }).tipo,
    ).toBe("duplicado");
  });
});

describe("agenda: respuesta del PATCH", () => {
  it("un PATCH exitoso reemplaza el estado con el de la respuesta", () => {
    const lista = [cita({ id: "c1", status: "CONFIRMED" })];
    const respuesta = cita({ id: "c1", status: "NO_SHOW" });
    const siguiente = fusionarCita(lista, respuesta, "c1");
    expect(siguiente[0]?.status).toBe("NO_SHOW");
    expect(mensajeTransicion("NO_SHOW", "Ana").descripcion).toContain("Inasistencia");
    expect(mensajeTransicion("NO_SHOW", "Ana").descripcion).not.toContain("Atendida");
    expect(mensajeTransicion("COMPLETED", "Ana").descripcion).toContain("Atendida");
  });

  it("un PATCH rechazado conserva el estado original", () => {
    const lista = [cita({ id: "c1", status: "CONFIRMED" })];
    expect(fusionarCita(lista, null, "c1")[0]?.status).toBe("CONFIRMED");
    expect(estadoTrasOperacion("CONFIRMED", null)).toBe("CONFIRMED");
  });

  it("el doble clic no reserva una segunda solicitud", () => {
    const enCurso = new Set<string>();
    expect(reservarOperacion(enCurso, "c1")).toBe(true);
    expect(reservarOperacion(enCurso, "c1")).toBe(false);
  });

  it("una cita futura no se atiende ni se marca inasistencia", () => {
    const acciones = accionesDeCita({
      status: "CONFIRMED",
      inicioIso: FUTURA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
    expect(decisionInasistencia({ elegible: acciones.inasistencia, bloqueada: false })).toBe(
      "cerrar",
    );
  });

  it("una cita cancelada no ofrece acciones y cierra la inasistencia sin enviar", () => {
    const acciones = accionesDeCita({
      status: "CANCELLED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: true,
    });
    expect(acciones.atender).toBe(false);
    expect(acciones.inasistencia).toBe(false);
    let enviados = 0;
    const decision = decisionInasistencia({ elegible: false, bloqueada: false });
    if (decision === "enviar") enviados += 1;
    expect(decision).toBe("cerrar");
    expect(enviados).toBe(0);
  });

  it("si ya hay una solicitud, la confirmación espera y no reenvía", () => {
    expect(decisionInasistencia({ elegible: true, bloqueada: true })).toBe("esperar");
  });
});

describe("consulta de historias", () => {
  it("una respuesta vacía exitosa es estado vacío", () => {
    expect(clasificarConsultaHistorias({ ok: true, historias: [] }).estado).toBe("vacio");
  });

  it("un error 500 no se presenta como lista vacía", () => {
    const clasificado = clasificarConsultaHistorias({ ok: false });
    expect(clasificado.estado).toBe("error");
    expect(clasificado).not.toHaveProperty("historias");
    const acciones = accionesDeCita({
      status: "COMPLETED",
      inicioIso: PASADA,
      ahoraMs: AHORA,
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: false,
    });
    expect(acciones.registrarHistoria).toBe(false);
  });

  it("el reintento pasa de error a pendiente y luego puede recuperar la lista", () => {
    let estado = reducirConsultas({}, { tipo: "iniciar", pacienteIds: ["pac-1"] });
    estado = reducirConsultas(estado, { tipo: "fallo", pacienteId: "pac-1" });
    expect(estado["pac-1"]).toBe("error");
    estado = reducirConsultas(estado, { tipo: "iniciar", pacienteIds: ["pac-1"] });
    expect(estado["pac-1"]).toBe("pendiente");
    estado = reducirConsultas(estado, { tipo: "exito", pacienteId: "pac-1" });
    expect(estado["pac-1"]).toBe("ok");
    expect(clasificarConsultaHistorias({ ok: true, historias: [{ id: 1 }] }).estado).toBe("lista");
  });

  it("cambiar de paciente no conserva las historias del anterior", () => {
    const vista = { pacienteId: "ana", historias: [{ id: 1 }] };
    expect(historiasDelPaciente(vista, "luis")).toEqual([]);
    expect(historiasDelPaciente(vista, "ana")).toHaveLength(1);
  });

  it("sin identificador no usa el nombre del paciente", () => {
    const { porId, sinIdentificador } = agruparPacientesPorId([
      { patientId: undefined, patient: "Ana López" },
      { patientId: "Ana López" },
    ]);
    expect(sinIdentificador).toBe(2);
    expect(porId.size).toBe(0);
    expect(idPacienteConsultable("Ana López")).toBeNull();
    expect(idPacienteConsultable("pac-1")).toBe("pac-1");
    expect(rutaHistoriasDePaciente("pac-1")).toContain("paciente_id=pac-1");
  });
});

describe("DISP02-O07: registrar historia aunque falle la consulta", () => {
  it("solo espera mientras la consulta está pendiente", () => {
    expect(historiaConsultable(undefined)).toBe(false);
    expect(historiaConsultable("pendiente")).toBe(false);
    expect(historiaConsultable("ok")).toBe(true);
    expect(historiaConsultable("error")).toBe(true);
  });

  it("con la consulta fallida, una cita COMPLETADA ofrece «Registrar historia»", () => {
    const acciones = accionesDeCita({
      status: "COMPLETED",
      inicioIso: "2026-11-16T10:00:00-05:00",
      ahoraMs: Date.parse("2026-11-20T10:00:00-05:00"),
      historiaRegistrada: false,
      historiaCerrada: false,
      puedeComprobarHistoria: historiaConsultable("error"),
    });
    expect(acciones.registrarHistoria).toBe(true);
    // El duplicado lo frena el backend con 409, que no se muestra como guardado nuevo.
    expect(efectoRespuestaHistoria(409).mostrarComoRegistrada).toBe(false);
  });

  it("el mensaje de error incluye el código HTTP", () => {
    expect(detalleDeError(new ApiError(500, "Ocurrió un error inesperado"), "x")).toBe(
      "Ocurrió un error inesperado (HTTP 500)",
    );
    expect(detalleDeError(new ApiError(403, "No"), "x")).toContain("(HTTP 403)");
    expect(detalleDeError(new ApiError(0, "Sin red"), "x")).toBe("Sin red (sin conexión)");
    expect(detalleDeError(new Error("x"), "por defecto")).toBe("por defecto");
  });
});
