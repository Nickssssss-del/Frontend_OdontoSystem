import * as React from "react";
import { cn } from "@/lib/utils";

export type Billetera = "yape" | "plin";

const NOMBRE: Record<Billetera, string> = { yape: "Yape", plin: "Plin" };

/** Color de cada billetera para el distintivo de respaldo (cuando no está el archivo del logo). */
const COLOR: Record<Billetera, string> = {
  yape: "bg-[#742284] text-white",
  plin: "bg-[#00a9b7] text-white",
};

/**
 * Logo de Yape o Plin. Usa el archivo oficial de public/pagos/{yape|plin}.png; si todavía no está,
 * muestra un distintivo con el nombre en el color de la billetera, para que el botón nunca quede vacío.
 */
export function LogoBilletera({
  billetera,
  className,
}: {
  billetera: Billetera;
  className?: string;
}) {
  const [sinArchivo, setSinArchivo] = React.useState(false);

  if (sinArchivo) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-lg text-[11px] font-bold",
          COLOR[billetera],
          className,
        )}
      >
        {NOMBRE[billetera].charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={`/pagos/${billetera}.png`}
      alt=""
      aria-hidden="true"
      width={28}
      height={28}
      className={cn("size-7 rounded-lg object-contain", className)}
      onError={() => setSinArchivo(true)}
    />
  );
}

export const nombreBilletera = (b: Billetera) => NOMBRE[b];
