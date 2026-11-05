import * as React from "react";
import { cn } from "@/lib/utils";
import { NOMBRE, nombreBilletera } from "./logoBilleteraUtils";

export type Billetera = "yape" | "plin";

const COLOR: Record<Billetera, string> = {
  yape: "bg-[#742284] text-white",
  plin: "bg-[#00a9b7] text-white",
};

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
        {nombreBilletera(billetera).charAt(0)}
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
