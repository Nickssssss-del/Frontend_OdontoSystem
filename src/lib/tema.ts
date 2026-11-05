/**
 * Preferencias de apariencia (tema y tamaño de texto).
 * Se guardan en este dispositivo (localStorage) y se aplican sobre <html>:
 * el tema oscuro usa la clase `.dark` ya definida en styles.css.
 */
export type Tema = "claro" | "oscuro" | "sistema";
export type TamanoTexto = "normal" | "grande";

const CLAVE_TEMA = "odontosystem.tema";
const CLAVE_TEXTO = "odontosystem.texto";

export function leerTema(): Tema {
  try {
    const v = localStorage.getItem(CLAVE_TEMA);
    return v === "claro" || v === "oscuro" || v === "sistema" ? v : "claro";
  } catch {
    return "claro";
  }
}

export function leerTamanoTexto(): TamanoTexto {
  try {
    return localStorage.getItem(CLAVE_TEXTO) === "grande" ? "grande" : "normal";
  } catch {
    return "normal";
  }
}

export function aplicarTema(tema: Tema) {
  const oscuro =
    tema === "oscuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

export function aplicarTamanoTexto(tamano: TamanoTexto) {
  document.documentElement.style.fontSize = tamano === "grande" ? "112.5%" : "";
}

export function guardarTema(tema: Tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* sin almacenamiento: dura mientras la pestaña esté abierta */
  }
  aplicarTema(tema);
}

export function guardarTamanoTexto(tamano: TamanoTexto) {
  try {
    localStorage.setItem(CLAVE_TEXTO, tamano);
  } catch {
    /* idem */
  }
  aplicarTamanoTexto(tamano);
}

/** Script en línea para el <head>: evita el parpadeo de tema claro antes de hidratar. */
export const SCRIPT_TEMA_INICIAL = `(function(){try{var t=localStorage.getItem("${CLAVE_TEMA}");var d=t==="oscuro"||(t==="sistema"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");if(localStorage.getItem("${CLAVE_TEXTO}")==="grande")document.documentElement.style.fontSize="112.5%";}catch(e){}})();`;
