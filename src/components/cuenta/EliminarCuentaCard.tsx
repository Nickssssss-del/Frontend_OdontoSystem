import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, usuariosApi } from "@/lib/api";

/**
 * Eliminar la cuenta (Ley N.º 29733 y política de Google Play): POST /api/usuarios/yo/eliminar-cuenta
 * con confirmacion = "ELIMINAR" y la contraseña (las cuentas creadas con Google solo confirman).
 * Al terminar, cierra la sesión con `onEliminada`.
 */
export function EliminarCuentaCard({ onEliminada }: { onEliminada: () => void }) {
  const [abierto, setAbierto] = React.useState(false);
  const [confirmacion, setConfirmacion] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [ocupado, setOcupado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const eliminar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setOcupado(true);
    setError(null);
    try {
      await usuariosApi.eliminarCuenta(confirmacion.trim(), password || undefined);
      toast.success("Tu cuenta fue eliminada", {
        description: "Se cancelaron tus citas futuras y se borraron tus datos personales.",
      });
      setAbierto(false);
      onEliminada();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar la cuenta.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold">Eliminar mi cuenta</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cancela tus citas futuras y borra tus datos personales. No se puede deshacer.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-destructive/60 text-destructive hover:bg-destructive/10"
          onClick={() => setAbierto(true)}
        >
          <Trash2 className="mr-2 size-4" aria-hidden="true" /> Eliminar cuenta
        </Button>
      </CardContent>

      <Dialog open={abierto} onOpenChange={(v) => !ocupado && setAbierto(v)}>
        <DialogContent>
          <form onSubmit={(e) => void eliminar(e)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
              <DialogDescription>
                Se conservan sin datos de contacto las citas, pagos e historias clínicas que exige
                la ley. Escribe <span className="font-semibold">ELIMINAR</span> para confirmar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar-eliminar">Confirmación</Label>
              <Input
                id="confirmar-eliminar"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="off"
                placeholder="ELIMINAR"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password-eliminar">Contraseña</Label>
              <Input
                id="password-eliminar"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">Si entras con Google, déjala vacía.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={ocupado}
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={ocupado || confirmacion.trim() !== "ELIMINAR"}
              >
                {ocupado && <Loader2 className="mr-2 size-4 animate-spin" />}
                Eliminar definitivamente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
