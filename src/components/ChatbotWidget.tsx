import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, CheckCheck, MessageSquare, Send, X } from "lucide-react";
import { dentists, soles } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bubble =
  | { id: string; from: "user"; text: string }
  | { id: string; from: "bot"; text: string; kind?: "text" }
  | { id: string; from: "bot"; kind: "carousel"; text: string }
  | { id: string; from: "bot"; kind: "slots"; text: string; slots: string[] }
  | { id: string; from: "bot"; kind: "qr"; text: string }
  | { id: string; from: "bot"; kind: "reminder"; text: string }
  | { id: string; from: "bot"; kind: "commands"; text: string };

const quickOptions = [
  { label: "Recomiéndame un dentista", intent: "carousel" },
  { label: "Quiero reservar a las 10 AM", intent: "slots" },
  { label: "¿Cómo pago con Yape?", intent: "qr" },
  { label: "Mi próxima cita", intent: "reminder" },
  { label: "Soy dentista", intent: "commands" },
] as const;

let seq = 0;
const nid = () => `b${++seq}`;

export function ChatbotWidget() {
  const [open, setOpen] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [bubbles, setBubbles] = React.useState<Bubble[]>([
    {
      id: nid(),
      from: "bot",
      text: "¡Hola Nicole! 👋 Soy OdontoBot. Puedo recomendarte un dentista en Ica, agendar tu cita o guiarte con el pago por Yape/Plin.",
    },
  ]);
  const scroller = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, typing, open]);

  const respond = (intent: string, userText: string) => {
    setBubbles((b) => [...b, { id: nid(), from: "user", text: userText }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setBubbles((b) => [...b, buildReply(intent)]);
    }, 900);
  };

  const buildReply = (intent: string): Bubble => {
    switch (intent) {
      case "carousel":
        return {
          id: nid(),
          from: "bot",
          kind: "carousel",
          text: "Estos son los 3 odontólogos mejor calificados cerca de ti 👇",
        };
      case "slots":
        return {
          id: nid(),
          from: "bot",
          kind: "slots",
          text: "Las 10:00 AM ya está ocupada 😥 Pero tengo estas alternativas:",
          slots: ["Hoy 11:00 AM", "Hoy 4:00 PM", "Mañana 9:00 AM"],
        };
      case "qr":
        return {
          id: nid(),
          from: "bot",
          kind: "qr",
          text: "Escanea este QR con Yape o Plin y súbeme la captura del comprobante.",
        };
      case "reminder":
        return {
          id: nid(),
          from: "bot",
          kind: "reminder",
          text: "Tienes una cita mañana a las 10:00 AM con la Dra. Claudia Manrique.",
        };
      case "commands":
        return {
          id: nid(),
          from: "bot",
          kind: "commands",
          text: "Modo dentista activado. Usa un comando rápido:",
        };
      default:
        return {
          id: nid(),
          from: "bot",
          text: "Puedo ayudarte con reservas, pagos y recordatorios. Elige una opción para continuar.",
        };
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    respond("free", text);
  };

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
                  <span className="size-1.5 rounded-full bg-success" /> En línea
                </p>
              </div>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {bubbles.map((b) => (
                <BubbleView key={b.id} bubble={b} onSlot={(s) => respond("qr", `Reservar ${s}`)} />
              ))}
              {typing && (
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

            <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2">
              {quickOptions.map((o) => (
                <button
                  key={o.label}
                  onClick={() => respond(o.intent, o.label)}
                  className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {o.label}
                </button>
              ))}
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe un mensaje…"
                className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="icon" className="size-10 rounded-full">
                <Send className="size-4" />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function BubbleView({ bubble, onSlot }: { bubble: Bubble; onSlot: (slot: string) => void }) {
  const isUser = bubble.from === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[86%] space-y-3 rounded-2xl px-3.5 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        <p className="leading-relaxed">{bubble.text}</p>

        {"kind" in bubble && bubble.kind === "carousel" && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {dentists
              .filter((d) => d.verified)
              .slice(0, 3)
              .map((d) => (
                <div
                  key={d.id}
                  className="w-40 shrink-0 rounded-2xl border border-border bg-card p-3"
                >
                  <div
                    className={cn(
                      "mb-2 flex h-16 items-center justify-center rounded-xl bg-gradient-to-br font-display text-lg font-semibold text-foreground",
                      d.tint,
                    )}
                  >
                    {d.initials}
                  </div>
                  <p className="text-xs font-semibold leading-tight">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.specialty}</p>
                  <p className="mt-1 text-xs font-semibold text-primary">
                    Desde {soles(d.price)}
                  </p>
                  <button className="mt-2 w-full rounded-full bg-primary py-1.5 text-[11px] font-semibold text-primary-foreground">
                    Ver horarios
                  </button>
                </div>
              ))}
          </div>
        )}

        {"kind" in bubble && bubble.kind === "slots" && (
          <div className="flex flex-wrap gap-2">
            {bubble.slots.map((s) => (
              <button
                key={s}
                onClick={() => onSlot(s)}
                className="rounded-full border border-primary/40 bg-card px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {"kind" in bubble && bubble.kind === "qr" && (
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <QrArt />
            <p className="mt-2 text-xs font-semibold">Yape / Plin: 956 402 118</p>
            <p className="text-[11px] text-muted-foreground">Titular: OdontoSystem SAC</p>
            <button className="mt-2 w-full rounded-full border border-primary/40 py-1.5 text-[11px] font-semibold text-primary">
              Adjuntar comprobante
            </button>
          </div>
        )}

        {"kind" in bubble && bubble.kind === "reminder" && (
          <div className="flex gap-2">
            <button className="flex-1 rounded-full bg-success/20 px-3 py-1.5 text-xs font-semibold text-success-foreground">
              <CheckCheck className="mr-1 inline size-3.5" />
              Confirmar
            </button>
            <button className="flex-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
              Reprogramar
            </button>
          </div>
        )}

        {"kind" in bubble && bubble.kind === "commands" && (
          <div className="space-y-1.5">
            {["Ver agenda de hoy", "Bloquear tarde", "Ingresos del mes"].map((c) => (
              <button
                key={c}
                className="block w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-xs font-medium"
              >
                /{c.toLowerCase().replaceAll(" ", "-")} — {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function QrArt() {
  const cells = React.useMemo(
    () => Array.from({ length: 144 }, (_, i) => (i * 7919) % 11 > 4),
    [],
  );
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
