import { Billetera } from "./LogoBilletera";

export const NOMBRE = {
  yape: "Yape",
  plin: "Plin",
} as const;

export const nombreBilletera = (b: Billetera) => NOMBRE[b];
