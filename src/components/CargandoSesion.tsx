import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

/**
 * Se muestra mientras el navegador todavía no leyó la sesión guardada (render del servidor y primer
 * render). Evita que una pantalla privada diga «Inicia sesión» a quien ya tiene sesión (DISP02-P12).
 */
export function CargandoSesion() {
  return (
    <AppShell>
      <div
        role="status"
        className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Cargando tu sesión…
      </div>
    </AppShell>
  );
}
