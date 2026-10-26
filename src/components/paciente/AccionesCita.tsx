import * as React from "react";
import { CalendarClock, FileDown, Loader2, Star, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectorTurnos } from "@/components/SelectorTurnos";
import {
  ApiError,
  apelacionesApi,
  asistenciaApi,
  citasApi,
  constanciaApi,
  guardarArchivo,
  reembolsosApi,
  odontologosApi,
  resenasApi,
  type Apelacion,
  type Cita,
  type Reembolso,
  type ServicioOdontologo,
} from "@/lib/api";
import { fechaHora, mensajeDe, soles } from "@/lib/formato";

const CON_PAGO: Cita["estado"][] = [
  "PENDIENTE_CONFIRMACION",
  "CONFIRMADA",
  "COMPLETADA",
  "CANCELADA_CON_REEMBOLSO",
  "INASISTENCIA_PENALIZADA",
];

/** Posición actual del paciente (para reportar que el odontólogo no llegó). */
function ubicacionActual(): Promise<{ latitud: number; longitud: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Tu navegador no permite obtener la ubicación."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitud: p.coords.latitude, longitud: p.coords.longitude }),
      () =>
        reject(new Error("Necesitamos tu ubicación para verificar que estás en el consultorio.")),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  });
}

/**
 * Acciones del paciente sobre una cita: constancia PDF, "¿te atendieron?", apelar una
 * inasistencia, ver reembolsos y editar la reseña. Úsalo dentro de la tarjeta de cada cita:
 *   <AccionesCita cita={cita} onCambio={recargarCitas} />
 */
export function AccionesCita({ cita, onCambio }: { cita: Cita; onCambio?: () => void }) {
  const [ocupado, setOcupado] = React.useState<string | null>(null);
  const [reembolsos, setReembolsos] = React.useState<Reembolso[] | null>(null);
  const [apelacion, setApelacion] = React.useState<Apelacion | null>(null);
  const [resena, setResena] = React.useState({ abierta: false, nota: 5, comentario: "" });

  const ahora = Date.now();
  const inicio = new Date(cita.inicio).getTime();
  const fin = new Date(cita.fin).getTime();
  // El backend acepta la respuesta desde 15 min después del inicio y hasta 72 h tras el fin.
  const puedeResponderAsistencia =
    cita.estado === "CONFIRMADA" && ahora >= inicio + 15 * 60_000 && ahora <= fin + 72 * 3_600_000;
  const duranteLaCita = ahora <= fin + 2 * 3_600_000;
  // RF05: solo citas pagadas, con 24 h o más de anticipación y una sola vez por cita.
  const puedeReprogramar =
    (cita.estado === "CONFIRMADA" || cita.estado === "PENDIENTE_CONFIRMACION") &&
    inicio - ahora >= 24 * 3_600_000 &&
    !cita.cita_origen_id;
  const [reprogramar, setReprogramar] = React.useState<{
    abierto: boolean;
    servicios: ServicioOdontologo[];
    nuevoInicio: string | null;
    recargar: number;
  }>({ abierto: false, servicios: [], nuevoInicio: null, recargar: 0 });

  // Cancelar cita
  const cancelarCita = async () => {
    if (!window.confirm("¿Estás seguro de cancelar esta cita?")) return;
    setOcupado("cancelar");
    try {
      await citasApi.cancelar(cita.id, "Cancelada por el paciente desde la web");
      toast.success("Cita cancelada", { description: "Se ha cancelado correctamente." });
      onCambio?.();
    } catch (e) {
      toast.error("No se pudo cancelar", { description: mensajeDe(e) });
    } finally {
      setOcupado(null);
    }
  };

  React.useEffect(() => {
    if (cita.estado !== "INASISTENCIA_PENALIZADA") return;
    let vivo = true;
    apelacionesApi
      .deMiCita(cita.id)
      .then((a) => vivo && setApelacion(a))
      .catch(() => undefined); // 404: todavía no apeló
    return () => {
      vivo = false;
    };
  }, [cita.id, cita.estado]);

  const correr = async (clave: string, accion: () => Promise<void>) => {
    setOcupado(clave);
    try {
      await accion();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : mensajeDe(e, (e as Error).message));
    } finally {
      setOcupado(null);
    }
  };

  const descargarConstancia = () =>
    correr("constancia", async () => {
      const pdf = await constanciaApi.descargar(cita.id);
      guardarArchivo(pdf, `constancia-${cita.id.slice(0, 8)}.pdf`);
    });

  const responderAsistencia = (atendido: boolean) =>
    correr("asistencia", async () => {
      const ubicacion = !atendido && duranteLaCita ? await ubicacionActual() : undefined;
      const r = await asistenciaApi.responder(cita.id, atendido, ubicacion);
      toast.success(r.mensaje);
      onCambio?.();
    });

  const verReembolsos = () =>
    correr("reembolsos", async () => setReembolsos(await reembolsosApi.deCita(cita.id)));

  const apelar = (archivo: File | undefined) => {
    if (!archivo) return;
    void correr("apelar", async () => {
      setApelacion(await apelacionesApi.apelar(cita.id, archivo));
      toast.success("Apelación enviada. Tu odontólogo la revisará.");
      onCambio?.();
    });
  };

  const abrirReprogramar = () =>
    correr("reprogramar-abrir", async () => {
      const perfil = await odontologosApi.perfil(cita.odontologo.id);
      const servicios = perfil.servicios.filter((s) => s.id === cita.servicio.id);
      if (servicios.length === 0) throw new Error("Este servicio ya no está disponible.");
      setReprogramar({ abierto: true, servicios, nuevoInicio: null, recargar: 0 });
    });

  const confirmarReprogramar = () =>
    correr("reprogramar", async () => {
      if (!reprogramar.nuevoInicio) return;
      try {
        await citasApi.reprogramar(cita.id, reprogramar.nuevoInicio);
      } catch (e) {
        // Otro paciente tomó el turno: se vuelven a pedir los horarios.
        if (e instanceof ApiError && e.status === 409)
          setReprogramar((r) => ({ ...r, nuevoInicio: null, recargar: r.recargar + 1 }));
        throw e;
      }
      toast.success("Cita reprogramada", { description: "Tu depósito pasa a la nueva fecha." });
      setReprogramar((r) => ({ ...r, abierto: false }));
      onCambio?.();
    });

  const guardarResena = () =>
    correr("resena", async () => {
      await resenasApi.editar(cita.id, resena.nota, resena.comentario);
      toast.success("Reseña actualizada");
      setResena((r) => ({ ...r, abierta: false }));
    });

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {CON_PAGO.includes(cita.estado) && (
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado !== null}
            onClick={() => void descargarConstancia()}
          >
            {ocupado === "constancia" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            Constancia de pago
          </Button>
        )}
        {(cita.estado === "CANCELADA_CON_REEMBOLSO" ||
          cita.estado === "INASISTENCIA_PENALIZADA") && (
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado !== null}
            onClick={() => void verReembolsos()}
          >
            Ver reembolso
          </Button>
        )}
        {puedeReprogramar && (
          <>
            <Button variant="outline" size="sm" disabled={ocupado !== null} onClick={cancelarCita}>
              {ocupado === "cancelar" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 size-4" />
              )}
              Cancelar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={ocupado !== null}
              onClick={() => void abrirReprogramar()}
            >
              {ocupado === "reprogramar-abrir" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 size-4" />
              )}
              Reprogramar
            </Button>
          </>
        )}
        {cita.estado === "COMPLETADA" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResena((r) => ({ ...r, abierta: !r.abierta }))}
          >
            <Star className="mr-2 size-4" /> Editar mi reseña
          </Button>
        )}
      </div>

      {puedeResponderAsistencia && (
        <div className="rounded-xl border border-border/70 p-3">
          <p className="mb-2 text-sm font-medium">¿Te atendieron?</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={ocupado !== null}
              onClick={() => void responderAsistencia(true)}
            >
              Sí, me atendieron
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={ocupado !== null}
              onClick={() => void responderAsistencia(false)}
            >
              No me atendieron
            </Button>
          </div>
          {duranteLaCita && (
            <p className="mt-2 text-xs text-muted-foreground">
              Para reportar que no llegó el odontólogo te pediremos tu ubicación: debes estar a
              menos de 200 m del consultorio.
            </p>
          )}
        </div>
      )}

      {reembolsos && (
        <ul className="space-y-1 text-sm">
          {reembolsos.length === 0 && (
            <li className="text-muted-foreground">Sin reembolsos registrados.</li>
          )}
          {reembolsos.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <Badge variant={r.estado === "REEMBOLSADO" ? "default" : "outline"}>{r.estado}</Badge>
              {soles(r.monto)} · {fechaHora(r.solicitado_en)}
              {r.simulado && <span className="text-xs text-muted-foreground">(simulado)</span>}
            </li>
          ))}
        </ul>
      )}

      {cita.estado === "INASISTENCIA_PENALIZADA" && (
        <div className="rounded-xl border border-border/70 p-3 text-sm">
          {apelacion ? (
            <p>
              Apelación: <Badge variant="outline">{apelacion.estado}</Badge>
              {apelacion.nota_resolucion && (
                <span className="ml-2">{apelacion.nota_resolucion}</span>
              )}
            </p>
          ) : (
            <>
              <p className="mb-2">
                ¿Tuviste un impedimento? Puedes apelar con un certificado (PDF, JPG o PNG de hasta 5
                MB) hasta 7 días después.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 hover:bg-accent">
                {ocupado === "apelar" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Subir certificado
                <input
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={ocupado !== null}
                  onChange={(e) => {
                    apelar(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </>
          )}
        </div>
      )}

      <Dialog
        open={reprogramar.abierto}
        onOpenChange={(v) =>
          ocupado !== "reprogramar" && setReprogramar((r) => ({ ...r, abierto: v }))
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
            <DialogDescription>
              Elige otro turno con {cita.odontologo.nombre}. Puedes reprogramar una sola vez y tu
              depósito pasa a la nueva fecha.
            </DialogDescription>
          </DialogHeader>
          {reprogramar.abierto && (
            <SelectorTurnos
              odontologoId={cita.odontologo.id}
              servicios={reprogramar.servicios}
              servicioId={cita.servicio.id}
              onServicio={() => undefined}
              inicio={reprogramar.nuevoInicio}
              onInicio={(i) => setReprogramar((r) => ({ ...r, nuevoInicio: i }))}
              recargar={reprogramar.recargar}
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={ocupado === "reprogramar"}
              onClick={() => setReprogramar((r) => ({ ...r, abierto: false }))}
            >
              Cancelar
            </Button>
            <Button
              disabled={!reprogramar.nuevoInicio || ocupado === "reprogramar"}
              onClick={() => void confirmarReprogramar()}
            >
              {ocupado === "reprogramar" && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar nuevo horario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {resena.abierta && (
        <div className="space-y-2 rounded-xl border border-border/70 p-3">
          <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={resena.nota === n}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                onClick={() => setResena((r) => ({ ...r, nota: n }))}
              >
                <Star
                  className={`size-6 ${n <= resena.nota ? "fill-current text-yellow-500" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
            rows={3}
            maxLength={1000}
            placeholder="Comentario (opcional)"
            value={resena.comentario}
            onChange={(e) => setResena((r) => ({ ...r, comentario: e.target.value }))}
          />
          <Button size="sm" disabled={ocupado !== null} onClick={() => void guardarResena()}>
            Guardar reseña
          </Button>
        </div>
      )}
    </div>
  );
}
