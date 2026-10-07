import * as React from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Bot, MapPin, MessageSquare, Send, Star, X } from "lucide-react";
import { ApiError, chatbotApi, type OdontologoResumen, type RespuestaChatbot } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * OdontoBot: conversa con el chatbot del backend (POST /api/chatbot/mensaje).
 * El backend detecta la intención, recuerda el contexto de la conversación y responde
 * con un "tipo" que indica cómo dibujar la respuesta (texto, lista de odontólogos…).
 * Requiere sesión iniciada: el chatbot conoce al usuario por su token.
 */

type Mensaje = {
  id: string;
  from: "user" | "bot";
  text: string;
  odontologos?: OdontologoResumen[];
  acciones?: string[];
};

/** Texto del botón y mensaje que se envía al backend para cada acción sugerida. */
const accionesConocidas: Record<string, { etiqueta: string; mensaje: string }> = {
  buscar_odontologo: { etiqueta: "Buscar odontólogo", mensaje: "Quiero buscar un odontólogo" },
  agendar_cita: { etiqueta: "Agendar una cita", mensaje: "Quiero agendar una cita" },
  ver_historial: { etiqueta: "Ver mis citas", mensaje: "Quiero ver mis citas" },
  elegir_distrito: { etiqueta: "Elegir distrito", mensaje: "Quiero elegir un distrito" },
};

const accionesIniciales = ["buscar_odontologo", "agendar_cita", "ver_historial"];

const describirAccion = (accion: string) =>
  accionesConocidas[accion] ?? {
    etiqueta: accion.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()),
    mensaje: accion.replaceAll("_", " "),
  };

let contador = 0;
const nuevoId = () => `m${Date.now()}-${contador++}`;

function aMensajeBot(respuesta: RespuestaChatbot): Mensaje {
  const odontologos =
    respuesta.tipo === "lista_odontologos" && Array.isArray(respuesta.datos)
      ? (respuesta.datos as OdontologoResumen[])
      : undefined;
  return {
    id: nuevoId(),
    from: "bot",
    text: respuesta.mensaje,
    ...(odontologos ? { odontologos } : {}),
    ...(respuesta.acciones?.length ? { acciones: respuesta.acciones } : {}),
  };
}

export function ChatbotWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [sesionId, setSesionId] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const { usuario } = useAppState();
  const scroller = React.useRef<HTMLDivElement>(null);

  // Si cambia el usuario (login/logout), la conversación empieza de cero.
  React.useEffect(() => {
    setMensajes([]);
    setSesionId(undefined);
  }, [usuario?.nombre, usuario?.rol]);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, loading, open]);

  const ask = async (text: string) => {
    if (loading || !usuario) return;
    setMensajes((prev) => [...prev, { id: nuevoId(), from: "user", text }]);
    setLoading(true);
    try {
      const respuesta = await chatbotApi.enviarMensaje(text, sesionId);
      setSesionId(respuesta.sesion_id);
      setMensajes((prev) => [...prev, aMensajeBot(respuesta)]);
    } catch (error) {
      const detalle =
        error instanceof ApiError ? error.message : "Intenta de nuevo en unos segundos.";
      setMensajes((prev) => [
        ...prev,
        { id: nuevoId(), from: "bot", text: `No pude responder ahora. ${detalle}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void ask(text);
  };

  // Botones sugeridos: los de la última respuesta del bot, o los iniciales.
  const ultimoBot = [...mensajes].reverse().find((m) => m.from === "bot");
  const sugeridas = ultimoBot?.acciones ?? (mensajes.length === 0 ? accionesIniciales : []);

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        aria-label={open ? "Cerrar chat" : "Abrir chat de OdontoBot"}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={open ? "x" : "chat"}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {open ? <X className="size-6" /> : <MessageSquare className="size-6" />}
          </motion.span>
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 size-4 animate-ping rounded-full bg-accent" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-24 right-5 z-50 flex h-[560px] w-[min(94vw,380px)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">OdontoBot</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      usuario ? "bg-success" : "bg-muted-foreground",
                    )}
                  />
                  {loading ? "Escribiendo…" : usuario ? "En línea" : "Inicia sesión para chatear"}
                </p>
              </div>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {usuario ? (
                <BubbleView
                  from="bot"
                  text={`¡Hola ${usuario.nombre.split(" ")[0]}! 👋 Soy OdontoBot. Puedo ayudarte a buscar un odontólogo en Ica, agendar una cita o revisar tus citas.`}
                />
              ) : (
                <div className="space-y-3">
                  <BubbleView
                    from="bot"
                    text="¡Hola! 👋 Soy OdontoBot. Para ayudarte con tus citas necesito saber quién eres: inicia sesión o crea tu cuenta."
                  />
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="ml-1 inline-flex rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    Ir a iniciar sesión
                  </Link>
                </div>
              )}
              {mensajes.map((m) => (
                <div key={m.id} className="space-y-2">
                  <BubbleView from={m.from} text={m.text} />
                  {m.odontologos?.map((o) => (
                    <TarjetaOdontologo key={o.id} odontologo={o} />
                  ))}
                </div>
              ))}
              {loading && (
                <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {usuario && sugeridas.length > 0 && (
              <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2">
                {sugeridas.map((accion) => {
                  const { etiqueta, mensaje } = describirAccion(accion);
                  return (
                    <button
                      key={accion}
                      onClick={() => void ask(mensaje)}
                      disabled={loading}
                      className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                    >
                      {etiqueta}
                    </button>
                  );
                })}
              </div>
            )}

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={usuario ? "Escribe tu pregunta…" : "Inicia sesión para escribir"}
                disabled={!usuario}
                maxLength={1000}
                className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                className="size-10 rounded-full"
                disabled={loading || !usuario}
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function TarjetaOdontologo({ odontologo }: { odontologo: OdontologoResumen }) {
  return (
    <div className="ml-1 max-w-[86%] rounded-2xl border border-border bg-background px-3 py-2.5 text-sm">
      <p className="font-semibold">{odontologo.nombre}</p>
      {odontologo.consultorio && (
        <p className="text-xs text-muted-foreground">{odontologo.consultorio}</p>
      )}
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        {odontologo.distrito && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {odontologo.distrito}
          </span>
        )}
        {odontologo.calificacion != null && (
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-current text-warning" />
            {Number(odontologo.calificacion).toFixed(1)}
            {odontologo.total_resenas != null && ` (${odontologo.total_resenas})`}
          </span>
        )}
      </div>
    </div>
  );
}

function BubbleView({ from, text }: { from: "user" | "bot"; text: string }) {
  const isUser = from === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {text}
      </div>
    </motion.div>
  );
}

export function QrArt() {
  const cells = React.useMemo(() => Array.from({ length: 144 }, (_, i) => (i * 7919) % 11 > 4), []);
  return (
    <div className="mx-auto grid w-28 grid-cols-12 gap-px rounded-lg bg-card p-1.5 ring-1 ring-border">
      {cells.map((on, i) => (
        <span
          key={i}
          className={cn("aspect-square rounded-[1px]", on ? "bg-foreground" : "bg-transparent")}
        />
      ))}
    </div>
  );
}
