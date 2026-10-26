import * as React from "react";
import { BadgeCheck, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, usuariosApi } from "@/lib/api";

/**
 * Verificación del correo con código de 6 dígitos (OTP). Sin verificar, el backend no deja reservar
 * citas (403). Usa POST /api/usuarios/yo/verificar-correo/codigo y POST /api/usuarios/yo/verificar-correo.
 * Sirve para ambos roles.
 */
export function VerificacionCorreoCard({
  correo,
  verificado,
  onVerificado,
}: {
  correo: string;
  verificado: boolean;
  onVerificado?: () => void;
}) {
  const [codigo, setCodigo] = React.useState("");
  const [ocupado, setOcupado] = React.useState<"enviar" | "verificar" | null>(null);
  const [enviado, setEnviado] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const enviar = async () => {
    setOcupado("enviar");
    setError(null);
    try {
      await usuariosApi.pedirCodigoCorreo();
      setEnviado(true);
      toast.success("Te enviamos un código", { description: `Revisa ${correo}. Vale 15 minutos.` });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        onVerificado?.();
        return;
      }
      setError(e instanceof ApiError ? e.message : "No se pudo enviar el código.");
    } finally {
      setOcupado(null);
    }
  };

  const verificar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    setOcupado("verificar");
    setError(null);
    try {
      await usuariosApi.verificarCorreo(codigo);
      toast.success("Correo verificado", { description: "Ya puedes reservar citas." });
      setCodigo("");
      onVerificado?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo verificar el código.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-xl">
          <MailCheck className="size-5 text-primary" aria-hidden="true" /> Verificación de correo
        </CardTitle>
        <CardDescription>
          {verificado
            ? "Tu correo está verificado."
            : "Necesitas verificar tu correo para reservar citas."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verificado ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <BadgeCheck className="size-4" aria-hidden="true" /> {correo}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Enviaremos un código de 6 dígitos a <span className="font-medium">{correo}</span>.
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={ocupado !== null}
                onClick={() => void enviar()}
              >
                {ocupado === "enviar" && <Loader2 className="mr-2 size-4 animate-spin" />}
                {enviado ? "Enviar otro código" : "Enviar código"}
              </Button>
            </div>
            <form onSubmit={(e) => void verificar(e)} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="codigo-correo">Código</Label>
                <Input
                  id="codigo-correo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                  className="w-40 tracking-[0.3em]"
                  placeholder="000000"
                />
              </div>
              <Button type="submit" className="rounded-xl" disabled={ocupado !== null}>
                {ocupado === "verificar" && <Loader2 className="mr-2 size-4 animate-spin" />}
                Verificar
              </Button>
            </form>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
