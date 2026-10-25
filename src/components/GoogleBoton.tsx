import * as React from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Botón oficial "Iniciar sesión con Google" (Google Identity Services, RF16).
 * Entrega el ID token a `alRecibirToken`; el backend lo valida en POST /api/auth/google.
 *
 * Necesita VITE_GOOGLE_CLIENT_ID (el mismo Client ID web que usa el backend en GOOGLE_CLIENT_ID)
 * y que el origen de la página esté en "Orígenes autorizados de JavaScript" en Google Cloud.
 */
const CLIENT_ID = (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined)?.trim();
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (respuesta: { credential?: string }) => void;
  }) => void;
  renderButton: (elemento: HTMLElement, opciones: Record<string, unknown>) => void;
};

const googleId = (): GoogleId | undefined =>
  (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;

function cargarScript(): Promise<void> {
  if (googleId()) return Promise.resolve();
  return new Promise((resolver, rechazar) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existente ?? document.createElement("script");
    script.addEventListener("load", () => resolver());
    script.addEventListener("error", () => rechazar(new Error("No se pudo cargar Google")));
    if (!existente) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

// Google solo admite un initialize(): se hace una vez y el callback apunta siempre al botón montado.
let inicializado = false;
let alToken: (idToken: string) => void = () => undefined;

export function GoogleBoton({
  alRecibirToken,
  deshabilitado = false,
}: {
  alRecibirToken: (idToken: string) => void;
  deshabilitado?: boolean;
}) {
  const contenedor = React.useRef<HTMLDivElement>(null);
  alToken = alRecibirToken;
  const [fallo, setFallo] = React.useState(false);

  React.useEffect(() => {
    if (!CLIENT_ID) return;
    let activo = true;
    cargarScript()
      .then(() => {
        const id = googleId();
        if (!activo || !id || !contenedor.current) return;
        if (!inicializado) {
          id.initialize({
            client_id: CLIENT_ID,
            callback: (r) => {
              if (r.credential) alToken(r.credential);
            },
          });
          inicializado = true;
        }
        id.renderButton(contenedor.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          locale: "es",
          width: Math.min(contenedor.current.clientWidth || 320, 400),
        });
      })
      .catch(() => activo && setFallo(true));
    return () => {
      activo = false;
    };
  }, []);

  if (!CLIENT_ID || fallo) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl"
        onClick={() =>
          toast.info("El ingreso con Google no está disponible ahora.", {
            description: CLIENT_ID
              ? "No se pudo cargar Google. Usa tu correo y contraseña."
              : "Falta configurar VITE_GOOGLE_CLIENT_ID. Por ahora usa tu correo y contraseña.",
          })
        }
      >
        <Mail className="mr-2 size-4" />
        Google
      </Button>
    );
  }

  return (
    <div
      ref={contenedor}
      aria-disabled={deshabilitado}
      className={
        deshabilitado ? "pointer-events-none flex justify-center opacity-50" : "flex justify-center"
      }
    />
  );
}
