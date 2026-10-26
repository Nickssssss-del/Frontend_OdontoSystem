import * as React from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConfiguracionPagos, DatosPasarela, MetodoPago } from "@/lib/api";
import { soles } from "@/lib/mock-data";

/**
 * Formulario de pago de la pasarela activa del backend (GET /api/public/pagos/config).
 *
 * - Mercado Pago: Card Payment Brick de MercadoPago.js. Entrega `token` y `medio_pago_id`.
 *
 * En modo simulado la página no usa este componente. El token se envía al backend con
 * POST /api/citas/{id}/pagar; los datos de la tarjeta nunca pasan por nuestro servidor.
 */

export type PasarelaPagoProps = {
  config: ConfiguracionPagos;
  /** Depósito en soles. */
  monto: number;
  /** Se llama con el token de la pasarela; debe devolver una promesa que termina cuando el backend respondió. */
  onToken: (metodo: MetodoPago, datos: DatosPasarela) => Promise<void>;
  /** true mientras el backend procesa el pago (deshabilita el botón). */
  enviando: boolean;
};

// --- Tipos mínimos de los SDK externos (se cargan por <script>, no hay paquete npm) -----------------
type MpBrickControlador = { unmount: () => void };
type MpFormData = { token?: string; payment_method_id?: string };
type MpSubmit = MpFormData & { formData?: MpFormData };
type MercadoPagoSdk = new (
  llave: string,
  opciones: { locale: string },
) => {
  bricks: () => {
    create: (
      tipo: "cardPayment",
      idContenedor: string,
      opciones: {
        initialization: { amount: number };
        callbacks: {
          onReady?: () => void;
          onSubmit: (datos: MpSubmit) => Promise<void>;
          onError?: (error: unknown) => void;
        };
      },
    ) => Promise<MpBrickControlador>;
  };
};

type VentanaConPasarelas = Window & {
  MercadoPago?: MercadoPagoSdk;
};

const SDK_MERCADO_PAGO = "https://sdk.mercadopago.com/js/v2";

/** Carga un <script> una sola vez; la promesa se rechaza si el navegador no logra descargarlo. */
function cargarScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);
    if (existente) {
      if (existente.dataset["cargado"] === "1") return resolve();
      existente.addEventListener("load", () => resolve(), { once: true });
      existente.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar la pasarela")),
        {
          once: true,
        },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset["cargado"] = "1";
      resolve();
    });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error("No se pudo cargar la pasarela de pago. Revisa tu conexión."));
    });
    document.head.appendChild(script);
  });
}

export function PasarelaPago(props: PasarelaPagoProps) {
  if (props.config.modo === "mercadopago") return <MercadoPagoBrick {...props} />;
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Mercado Pago
// ---------------------------------------------------------------------------------------------------
function MercadoPagoBrick({ config, monto, onToken, enviando }: PasarelaPagoProps) {
  const idContenedor = React.useId().replace(/:/g, "");
  const [estado, setEstado] = React.useState<"cargando" | "listo" | "error">("cargando");
  const [detalle, setDetalle] = React.useState<string | null>(null);
  // El Brick se crea una sola vez: onToken/enviando cambian en cada render y se leen desde refs.
  const onTokenRef = React.useRef(onToken);
  onTokenRef.current = onToken;
  const llave = config.mercadopago_llave_publica;

  React.useEffect(() => {
    if (!llave) {
      setEstado("error");
      setDetalle("Mercado Pago no está configurado en el servidor.");
      return;
    }
    let cancelado = false;
    let brick: MpBrickControlador | null = null;

    cargarScript(SDK_MERCADO_PAGO)
      .then(async () => {
        const Sdk = (window as VentanaConPasarelas).MercadoPago;
        if (!Sdk) throw new Error("Mercado Pago no se inicializó.");
        const mp = new Sdk(llave, { locale: "es-PE" });
        const creado = await mp.bricks().create("cardPayment", idContenedor, {
          initialization: { amount: monto },
          callbacks: {
            onReady: () => {
              if (!cancelado) setEstado("listo");
            },
            // Debe devolver una promesa: si se rechaza, el Brick deja reintentar sin perder los datos.
            onSubmit: async (datos) => {
              const campos = datos.formData ?? datos;
              if (!campos.token)
                throw new Error("Mercado Pago no devolvió el token de la tarjeta.");
              await onTokenRef.current("TARJETA", {
                token: campos.token,
                ...(campos.payment_method_id ? { medio_pago_id: campos.payment_method_id } : {}),
              });
            },
            onError: (error) => {
              console.error("Error en el formulario de Mercado Pago:", error);
            },
          },
        });
        if (cancelado) creado.unmount();
        else brick = creado;
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setEstado("error");
        setDetalle(e instanceof Error ? e.message : "No se pudo abrir el formulario de pago.");
      });

    return () => {
      cancelado = true;
      brick?.unmount();
    };
  }, [llave, monto, idContenedor]);

  return (
    <div className="mt-4 space-y-3">
      {config.modo_prueba && (
        <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          Modo de prueba de Mercado Pago: usa una tarjeta de prueba, no una real.
        </p>
      )}
      {estado === "cargando" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando formulario de pago…
        </p>
      )}
      {estado === "error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {detalle}
        </p>
      )}
      {/* El Brick pinta aquí su propio formulario y su botón de pago. */}
      <div id={idContenedor} aria-busy={enviando} />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Depósito de {soles(monto)}. Pago procesado por Mercado
        Pago.
      </p>
    </div>
  );
}
