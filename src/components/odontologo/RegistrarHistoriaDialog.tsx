import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, historiasApi } from "@/lib/api";
import {
  decidirEnvioHistoria,
  efectoRespuestaHistoria,
  type ErroresHistoria,
} from "@/lib/atencion-cita";
import { mensajeDeError } from "@/components/perfil/perfilUtils";
import type { Appointment } from "@/lib/app-state-types";

type Props = {
  cita: Appointment | null;
  onClose: () => void;
  /** Solo se llama después de un POST exitoso. */
  onRegistrada: (citaId: string) => void;
  /** 409: el backend ya tiene una historia; no se presenta como un guardado nuevo. */
  onYaExistia: (citaId: string) => void;
};

export function RegistrarHistoriaDialog({ cita, onClose, onRegistrada, onYaExistia }: Props) {
  const [diagnostico, setDiagnostico] = React.useState("");
  const [tratamiento, setTratamiento] = React.useState("");
  const [notas, setNotas] = React.useState("");
  const [errores, setErrores] = React.useState<ErroresHistoria | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  const enviando = React.useRef(false);

  React.useEffect(() => {
    setDiagnostico("");
    setTratamiento("");
    setNotas("");
    setErrores(null);
    setGuardando(false);
    enviando.current = false;
  }, [cita?.id]);

  const cerrar = () => {
    if (guardando) return;
    onClose();
  };

  const guardar = async () => {
    if (!cita || enviando.current) return;
    const decision = decidirEnvioHistoria({
      diagnostico,
      tratamiento,
      notas,
      enviando: enviando.current,
    });
    if (decision.tipo === "duplicado") return;
    if (decision.tipo === "validacion") {
      setErrores(decision.errores);
      return;
    }
    enviando.current = true;
    setGuardando(true);
    setErrores(null);
    try {
      await historiasApi.registrar(cita.id, decision.cuerpo);
      const efecto = efectoRespuestaHistoria("ok");
      if (efecto.mostrarComoRegistrada) onRegistrada(cita.id);
      toast.success("Historia clínica registrada", {
        description: `Quedó asociada a la cita de ${cita.patient}.`,
      });
      if (efecto.cerrar) onClose();
    } catch (error) {
      const codigo = error instanceof ApiError && error.status === 409 ? 409 : "error";
      const efecto = efectoRespuestaHistoria(codigo);
      if (efecto.mostrarComoRegistrada) onRegistrada(cita.id);
      if (codigo === 409) {
        onYaExistia(cita.id);
        toast.error("No se registró otra historia", {
          description: mensajeDeError(error, "Esta cita ya tiene una historia clínica."),
        });
      } else {
        toast.error("No se pudo guardar la historia clínica", {
          description: mensajeDeError(error, "Revisa tu conexión e inténtalo de nuevo."),
        });
      }
      if (efecto.cerrar) onClose();
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  };

  return (
    <Dialog open={cita !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar historia clínica</DialogTitle>
          <DialogDescription>
            {cita
              ? `${cita.patient} · ${cita.service} · ${cita.date} ${cita.time}`
              : "Cita atendida"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="historia-diagnostico">Diagnóstico</Label>
            <Textarea
              id="historia-diagnostico"
              value={diagnostico}
              disabled={guardando}
              onChange={(e) => setDiagnostico(e.target.value)}
              placeholder="Diagnóstico de la atención"
            />
            {errores?.diagnostico && (
              <p className="text-sm text-destructive">{errores.diagnostico}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="historia-tratamiento">Tratamiento</Label>
            <Textarea
              id="historia-tratamiento"
              value={tratamiento}
              disabled={guardando}
              onChange={(e) => setTratamiento(e.target.value)}
              placeholder="Tratamiento realizado"
            />
            {errores?.tratamiento && (
              <p className="text-sm text-destructive">{errores.tratamiento}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="historia-notas">Notas (opcional)</Label>
            <Textarea
              id="historia-notas"
              value={notas}
              disabled={guardando}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales"
            />
            {errores?.notas && <p className="text-sm text-destructive">{errores.notas}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={cerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void guardar()} disabled={guardando}>
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Guardar historia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
