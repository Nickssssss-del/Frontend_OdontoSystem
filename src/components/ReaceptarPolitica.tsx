import * as React from "react";
import { Button } from "@/components/ui/button";
import { TerminosModal } from "@/components/TerminosModal";
import { consentimientosApi } from "@/lib/api";
import { useAppState } from "@/lib/app-state";

/**
 * Si la política de privacidad cambió de versión desde la última vez que el usuario la aceptó,
 * pide que acepte la nueva (Ley N.º 29733). Si la consulta falla, no bloquea la app.
 */
export function ReaceptarPolitica() {
  const { usuario } = useAppState();
  const [version, setVersion] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setVersion(null);
    if (!usuario) return;
    let vivo = true;
    consentimientosApi
      .estado()
      .then((estado) => {
        if (vivo && !estado.aceptada) setVersion(estado.version_vigente);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [usuario]);

  if (!version) return null;

  const aceptar = async () => {
    setEnviando(true);
    setError(false);
    try {
      await consentimientosApi.aceptar();
      setVersion(null);
    } catch {
      setError(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="politica-titulo"
      aria-describedby="politica-texto"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-lg">
        <h2 id="politica-titulo" className="font-display text-lg font-semibold text-foreground">
          Actualizamos nuestra política de privacidad
        </h2>
        <p id="politica-texto" className="mt-2 text-sm text-muted-foreground">
          Para seguir usando OdontoSystem necesitamos que leas y aceptes la versión {version}.
        </p>
        <TerminosModal
          mostrarAceptar={false}
          trigger={
            <button
              type="button"
              className="mt-3 inline-block cursor-pointer text-sm font-medium text-primary underline underline-offset-4"
            >
              Leer la política de privacidad
            </button>
          }
        />
        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            No se pudo guardar. Inténtalo otra vez.
          </p>
        )}
        <Button className="mt-5 w-full" onClick={aceptar} disabled={enviando} autoFocus>
          {enviando ? "Guardando…" : "Acepto"}
        </Button>
      </div>
    </div>
  );
}
