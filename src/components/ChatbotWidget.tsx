import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { dentists, soles } from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";
import { statusLabel } from "@/lib/app-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const quickOptions = [
  "¿Qué dentista me recomiendas para ortodoncia?",
  "¿Qué horarios libres hay hoy?",
  "¿Cuánto cuesta una limpieza dental?",
  "¿Cómo pago con Yape o Plin?",
  "¿Cómo va mi próxima cita?",
];

export function ChatbotWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const state = useAppState();
  const scroller = React.useRef<HTMLDivElement>(null);

  const contexto = React.useMemo(() => {
    const citas = state.appointments
      .map(
        (a) =>
          `${a.date} ${a.time} · ${a.service} con ${dentists.find((d) => d.id === a.dentistId)?.name ?? "—"} · ${soles(a.amount)} · estado: ${statusLabel[a.status]}${
            a.voucher ? ` · comprobante ${a.voucher.method} ${a.voucher.status}` : ""
          }`,
      )
      .join("\n");
    return [
      `Paciente: ${state.patient}. Strikes de puntualidad: ${state.strikes}. Cuenta suspendida: ${state.isBanned ? "sí" : "no"}.`,
      "Sus citas registradas:",
      citas || "Sin citas registradas.",
    ].join("\n");
  }, [state.appointments, state.patient, state.strikes, state.isBanned]);

  const transport = React.useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: () => ({ contexto }) }),
    [contexto],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) =>
      toast.error("OdontoBot no pudo responder", {
        description: error.message || "Intenta de nuevo en unos segundos.",
      }),
  });

  const loading = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, open]);

  const ask = (text: string) => {
    if (loading) return;
    void sendMessage({ text });
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    ask(text);
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
                  <span className="size-1.5 rounded-full bg-success" />
                  {loading ? "Escribiendo…" : "En línea"}
                </p>
              </div>
            </header>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              <BubbleView
                from="bot"
                text={`¡Hola ${state.patient.split(" ")[0]}! 👋 Soy OdontoBot. Pregúntame por horarios libres, precios de tratamientos o qué dentista de Ica te conviene.`}
              />
              {messages.map((m) => {
                const text = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("")
                  .trim();
                if (!text) return null;
                return (
                  <BubbleView
                    key={m.id}
                    from={m.role === "user" ? "user" : "bot"}
                    text={text}
                  />
                );
              })}
              {status === "submitted" && (
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
                  key={o}
                  onClick={() => ask(o)}
                  disabled={loading}
                  className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                >
                  {o}
                </button>
              ))}
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="icon" className="size-10 rounded-full" disabled={loading}>
                <Send className="size-4" />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
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
