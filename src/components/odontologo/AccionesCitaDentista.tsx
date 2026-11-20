import { CheckCircle2, Loader2, NotebookPen, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { accionesDeCita, inasistenciaDisponibleDesde } from "@/lib/atencion-cita";
import { horaDe } from "@/lib/odontologos";
import type { Appointment } from "@/lib/app-state-types";

type Props = {
  cita: Appointment;
  historiaRegistrada: boolean;
  historiaCerrada: boolean;
  puedeComprobarHistoria: boolean;
  operando: boolean;
  onAtender: () => void;
  onInasistencia: () => void;
  onRegistrar: () => void;
};

export function AccionesCitaDentista({
  cita,
  historiaRegistrada,
  historiaCerrada,
  puedeComprobarHistoria,
  operando,
  onAtender,
  onInasistencia,
  onRegistrar,
}: Props) {
  const acciones = accionesDeCita({
    status: cita.status,
    inicioIso: cita.inicio,
    ahoraMs: Date.now(),
    historiaRegistrada,
    historiaCerrada,
    puedeComprobarHistoria,
  });
  const confirmadaPendiente =
    cita.status === "CONFIRMED" && !acciones.atender && !acciones.inasistencia;

  if (historiaRegistrada) {
    return <p className="text-xs font-medium text-success">Historia registrada</p>;
  }
  if (historiaCerrada) {
    return (
      <p className="text-xs text-muted-foreground">
        Esta cita ya tiene una historia clínica en el servidor.
      </p>
    );
  }
  if (
    cita.status === "COMPLETED" &&
    !historiaRegistrada &&
    !historiaCerrada &&
    !puedeComprobarHistoria
  ) {
    return (
      <p className="text-xs text-muted-foreground">
        Falta confirmar si esta cita ya tiene historia clínica.
      </p>
    );
  }
  if (!acciones.atender && !acciones.inasistencia && !acciones.registrarHistoria) {
    return confirmadaPendiente ? (
      <p className="text-xs text-muted-foreground">Disponible cuando llegue la hora de inicio.</p>
    ) : null;
  }

  // Ya empezó pero sigue dentro de la tolerancia: se avisa en texto (en el celular no hay tooltip).
  const esperandoTolerancia =
    cita.status === "CONFIRMED" && acciones.atender && !acciones.inasistencia;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {acciones.atender && (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={operando}
            onClick={onAtender}
          >
            {operando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Atendida
          </Button>
        )}
        {acciones.inasistencia && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={operando}
            onClick={onInasistencia}
          >
            <UserX className="size-4" />
            Inasistencia
          </Button>
        )}
        {acciones.registrarHistoria && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={operando}
            onClick={onRegistrar}
          >
            <NotebookPen className="size-4" />
            Registrar historia
          </Button>
        )}
      </div>
      {esperandoTolerancia && (
        <p className="text-xs text-muted-foreground">
          «Inasistencia» se habilita a las{" "}
          {horaDe(new Date(inasistenciaDisponibleDesde(cita.inicio)).toISOString())} (15 min de
          tolerancia).
        </p>
      )}
    </div>
  );
}
