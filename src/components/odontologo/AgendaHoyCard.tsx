import * as React from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { agendaHoyApi, type AgendaHoy } from "@/lib/api";
import { fechaHora, mensajeDe } from "@/lib/formato";

/** "¿Atiendes hoy?" — GET/POST /api/odontologos/yo/agenda-hoy. */
export function AgendaHoyCard({ onCambio }: { onCambio?: () => void }) {
  const [hoy, setHoy] = React.useState<AgendaHoy | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [cancelando, setCancelando] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;
    agendaHoyApi
      .obtener()
      .then((h) => vivo && setHoy(h))
      .catch((e) => vivo && setError(mensajeDe(e)));
    return () => {
      vivo = false;
    };
  }, []);

  const responder = async (atiende: boolean) => {
    setEnviando(true);
    try {
      const h = await agendaHoyApi.confirmar(atiende, atiende ? undefined : motivo);
      setHoy(h);
      setCancelando(false);
      setMotivo("");
      toast.success(
        atiende
          ? "Listo: hoy aceptas reservas."
          : `No atiendes hoy. Se cancelaron ${h.citas_canceladas} cita(s) con reembolso.`,
      );
      onCambio?.();
    } catch (e) {
      toast.error(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="size-5" /> ¿Atiendes hoy?
        </CardTitle>
        <CardDescription>Sin confirmar, los pacientes no pueden reservar para hoy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!hoy && !error && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        {hoy && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {hoy.atiende === null && <Badge variant="outline">Sin confirmar</Badge>}
              {hoy.atiende === true && <Badge>Atiendes hoy</Badge>}
              {hoy.atiende === false && <Badge variant="destructive">No atiendes hoy</Badge>}
              <span className="text-muted-foreground">
                {hoy.citas_hoy} cita(s) hoy
                {hoy.primera_cita ? ` · la primera: ${fechaHora(hoy.primera_cita)}` : ""}
              </span>
            </div>

            {hoy.atiende !== false && !cancelando && (
              <div className="flex flex-wrap gap-2">
                {hoy.atiende === null && (
                  <Button disabled={enviando} onClick={() => void responder(true)}>
                    Sí, atiendo hoy
                  </Button>
                )}
                <Button variant="outline" disabled={enviando} onClick={() => setCancelando(true)}>
                  No atiendo hoy
                </Button>
              </div>
            )}

            {cancelando && (
              <div className="space-y-3 rounded-xl border border-destructive/40 p-4">
                <p className="text-sm">
                  Se cancelarán tus citas pendientes de hoy con reembolso del 100 % y se bloqueará
                  el resto del día. Cada paciente recibirá un correo.
                </p>
                <textarea
                  className="w-full rounded-md border border-input bg-background p-2 text-sm"
                  rows={2}
                  maxLength={255}
                  placeholder="Motivo (opcional)"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={enviando}
                    onClick={() => void responder(false)}
                  >
                    {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Confirmar y cancelar citas
                  </Button>
                  <Button variant="ghost" onClick={() => setCancelando(false)}>
                    Volver
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
