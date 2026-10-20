import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  Star,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AccionesCita } from "@/components/paciente/AccionesCita";
import { useAppState } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  citasApi,
  resenasApi,
  type Cita,
  type CitaPorResenar,
  type EstadoCita,
} from "@/lib/api";
import { soles } from "@/lib/mock-data";
import { fechaDe, fechaLarga, horaDe } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/panel")({
  head: () => ({
    meta: [
      { title: "Mi Panel | OdontoSystem" },
      {
        name: "description",
        content:
          "Tu panel de paciente: próximas citas, historial, reseñas y semáforo de puntualidad.",
      },
      { property: "og:title", content: "Mi Panel | OdontoSystem" },
      {
        property: "og:description",
        content: "Control centralizado de tu historial dental y citas.",
      },
    ],
  }),
  component: PacientePanel,
});

/** Inasistencias que suspenden la cuenta (regla de 3 strikes). */
const LIMITE_STRIKES = 3;
const HORAS_REEMBOLSO = 12;

const ACTIVAS: EstadoCita[] = ["PENDIENTE_PAGO", "PENDIENTE_CONFIRMACION", "CONFIRMADA"];

const etiquetaEstado: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "Pago pendiente",
  PENDIENTE_CONFIRMACION: "Esperando confirmación",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Atendida",
  CANCELADA_CON_REEMBOLSO: "Cancelada · depósito devuelto",
  CANCELADA_SIN_REEMBOLSO: "Cancelada",
  INASISTENCIA_PENALIZADA: "Inasistencia",
  REPROGRAMADA: "Reprogramada",
};

const claseEstado: Record<EstadoCita, string> = {
  PENDIENTE_PAGO: "bg-muted text-muted-foreground border-border",
  PENDIENTE_CONFIRMACION: "bg-warning/15 text-warning-foreground border-warning/40",
  CONFIRMADA: "bg-primary/10 text-primary border-primary/30",
  COMPLETADA: "bg-success/10 text-success border-success/30",
  CANCELADA_CON_REEMBOLSO: "bg-muted text-muted-foreground border-border",
  CANCELADA_SIN_REEMBOLSO: "bg-muted text-muted-foreground border-border",
  INASISTENCIA_PENALIZADA: "bg-destructive/10 text-destructive border-destructive/30",
  REPROGRAMADA: "bg-muted text-muted-foreground border-border",
};

type KPI = {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "accent" | "destructive" | "success";
};

function PacientePanel() {
  const { usuario } = useAppState();
  const esPaciente = usuario?.rol === "PACIENTE";

  const [citas, setCitas] = React.useState<Cita[]>([]);
  const [porResenar, setPorResenar] = React.useState<CitaPorResenar[]>([]);
  const [errorResenas, setErrorResenas] = React.useState(false);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [recargar, setRecargar] = React.useState(0);

  React.useEffect(() => {
    if (!esPaciente) {
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    setError(null);
    setErrorResenas(false);
    // Las reseñas pendientes son secundarias: si fallan, el panel de citas se muestra igual.
    const resenasPendientes = resenasApi.porResenar().catch((): CitaPorResenar[] => {
      if (vigente) setErrorResenas(true);
      return [];
    });
    Promise.all([citasApi.mias(), resenasPendientes])
      .then(([c, r]) => {
        if (!vigente) return;
        setCitas(c);
        setPorResenar(r);
      })
      .catch((e: unknown) => {
        if (vigente)
          setError(e instanceof ApiError ? e.message : "No se pudieron cargar tus citas.");
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [esPaciente, recargar]);

  const ahora = Date.now();
  const proximas = citas
    .filter((c) => ACTIVAS.includes(c.estado) && new Date(c.fin).getTime() > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const historial = citas.filter((c) => !proximas.includes(c));
  const atendidas = citas.filter((c) => c.estado === "COMPLETADA").length;
  const inasistencias = citas.filter((c) => c.estado === "INASISTENCIA_PENALIZADA").length;
  const cancelacionesTardias = citas.filter((c) => c.estado === "CANCELADA_SIN_REEMBOLSO").length;
  const asistencia =
    atendidas + inasistencias > 0
      ? `${Math.round((atendidas / (atendidas + inasistencias)) * 100)}%`
      : "—";

  const kpis: KPI[] = [
    {
      id: "proximas",
      label: "Próximas citas",
      value: proximas.length,
      icon: <Calendar className="size-5" />,
      color: "accent",
    },
    {
      id: "atendidas",
      label: "Citas atendidas",
      value: atendidas,
      icon: <CheckCircle2 className="size-5" />,
      color: "success",
    },
    {
      id: "resenar",
      label: "Por calificar",
      value: errorResenas ? "—" : porResenar.length,
      icon: <Star className="size-5" />,
      color: "primary",
    },
    {
      id: "asistencia",
      label: "Asistencia",
      value: asistencia,
      icon: <TrendingUp className="size-5" />,
      color: "primary",
    },
  ];

  if (!esPaciente) {
    return (
      <AppShell>
        <Card className="mx-auto mt-8 max-w-md text-center">
          <CardContent className="py-10">
            <LogIn className="mx-auto size-10 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Inicia sesión como paciente</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {usuario
                ? "Tu cuenta es de odontólogo: el panel de paciente es para quienes reservan citas."
                : "Aquí verás tus próximas citas, tu historial y las reseñas pendientes."}
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/">Ir a iniciar sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Bienvenida */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
          <div>
            <h1 className="mb-2 text-2xl font-semibold">
              Hola, <span className="text-primary">{usuario.nombre.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-muted-foreground">Tu salud dental, siempre bajo control.</p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/paciente/catalogo">Reservar una cita</Link>
          </Button>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Cargando tus citas…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="font-semibold text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setRecargar((n) => n + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi, idx) => (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {kpi.label}
                          </p>
                          <p className="text-2xl font-bold">{kpi.value}</p>
                        </div>
                        <div
                          className={cn(
                            "rounded-lg p-2",
                            kpi.color === "primary" && "bg-primary/12 text-primary",
                            kpi.color === "accent" && "bg-accent/12 text-accent",
                            kpi.color === "destructive" && "bg-destructive/12 text-destructive",
                            kpi.color === "success" && "bg-success/12 text-success",
                          )}
                        >
                          {kpi.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Próximas citas */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-5 text-primary" /> Próximas citas
                </CardTitle>
                <CardDescription>
                  Si cancelas con {HORAS_REEMBOLSO} horas o más de anticipación, se te devuelve el
                  depósito.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {proximas.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No tienes citas próximas.</p>
                  </div>
                ) : (
                  proximas.map((c) => (
                    <CitaProxima
                      key={c.id}
                      cita={c}
                      onCambio={() => setRecargar((n) => n + 1)}
                      onCancelada={(actualizada) =>
                        setCitas((prev) =>
                          prev.map((x) => (x.id === actualizada.id ? actualizada : x)),
                        )
                      }
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Por calificar */}
            {porResenar.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="size-5 text-primary" /> ¿Cómo te fue?
                  </CardTitle>
                  <CardDescription>
                    Tu reseña ayuda a otros pacientes de Ica a elegir.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {porResenar.map((p) => (
                    <Calificar
                      key={p.cita_id}
                      pendiente={p}
                      onListo={() =>
                        setPorResenar((prev) => prev.filter((x) => x.cita_id !== p.cita_id))
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Semáforo de puntualidad (con datos reales de tus citas) */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5 text-primary" /> Semáforo de Puntualidad
                </CardTitle>
                <CardDescription>
                  Cada inasistencia sin aviso suma un strike. Con {LIMITE_STRIKES} strikes la cuenta
                  se suspende. Si faltaste por un motivo de salud, puedes apelar con un certificado
                  médico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Medidor
                  label="Inasistencias"
                  valor={inasistencias}
                  max={LIMITE_STRIKES}
                  color="bg-destructive"
                />
                <Medidor
                  label="Cancelaciones sin reembolso"
                  valor={cancelacionesTardias}
                  max={Math.max(3, cancelacionesTardias)}
                  color="bg-warning"
                />
                {inasistencias >= 2 && inasistencias < LIMITE_STRIKES && (
                  <div className="flex gap-3 rounded-lg border border-warning/50 bg-warning/5 p-3">
                    <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-warning" />
                    <p className="text-sm">
                      <span className="font-medium text-warning">Atención:</span> te queda{" "}
                      {LIMITE_STRIKES - inasistencias} strike antes de la suspensión de tu cuenta.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" /> Historial de citas
                </CardTitle>
                <CardDescription>
                  {historial.length === 0
                    ? "Todavía no tienes citas pasadas."
                    : `${historial.length} cita(s) pasadas o canceladas.`}
                </CardDescription>
              </CardHeader>
              {historial.length > 0 && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Odontólogo</TableHead>
                          <TableHead>Servicio</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historial.map((c) => (
                          <TableRow key={c.id} className="hover:bg-muted/50">
                            <TableCell className="text-sm font-medium">
                              {c.odontologo.nombre}
                            </TableCell>
                            <TableCell className="text-sm">{c.servicio.titulo}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {fechaLarga(fechaDe(c.inicio))} · {horaDe(c.inicio)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {soles(Number(c.precio))}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={claseEstado[c.estado]}>
                                {etiquetaEstado[c.estado]}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[14rem]">
                              <AccionesCita cita={c} onCambio={() => setRecargar((n) => n + 1)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          </>
        )}
      </motion.div>
    </AppShell>
  );
}

function CitaProxima({
  cita,
  onCancelada,
  onCambio,
}: {
  cita: Cita;
  onCancelada: (c: Cita) => void;
  onCambio: () => void;
}) {
  const [confirmando, setConfirmando] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const horasFaltan = (new Date(cita.inicio).getTime() - Date.now()) / 3_600_000;
  const pagada = cita.estado !== "PENDIENTE_PAGO";
  const conReembolso = pagada && horasFaltan >= HORAS_REEMBOLSO;

  const cancelar = async () => {
    setEnviando(true);
    setError(null);
    try {
      onCancelada(await citasApi.cancelar(cita.id, "Cancelada por el paciente desde la web"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cancelar la cita.");
      setEnviando(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{cita.servicio.titulo}</p>
          <p className="text-sm text-muted-foreground">con {cita.odontologo.nombre}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <Calendar className="size-4 text-primary" />
            <span>{primeraMayuscula(fechaLarga(fechaDe(cita.inicio)))}</span> ·{" "}
            {horaDe(cita.inicio)}
          </p>
          {(cita.odontologo.consultorio || cita.odontologo.direccion) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {[cita.odontologo.consultorio, cita.odontologo.direccion, cita.odontologo.distrito]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <Badge variant="outline" className={claseEstado[cita.estado]}>
            {etiquetaEstado[cita.estado]}
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            Depósito {soles(Number(cita.deposito_requerido))} de {soles(Number(cita.precio))}
          </p>
        </div>
      </div>

      {cita.estado === "PENDIENTE_PAGO" && cita.pagar_antes_de && (
        <p className="mt-3 rounded-lg bg-warning/10 p-2 text-xs text-warning-foreground">
          Falta pagar el depósito antes de las {horaDe(cita.pagar_antes_de)}; si no, el turno se
          libera solo.
        </p>
      )}
      {cita.estado === "PENDIENTE_PAGO" && (
        <Button asChild size="sm" className="mt-3 rounded-full">
          <Link
            to="/paciente/agendar/$id"
            params={{ id: cita.odontologo.id }}
            search={{ cita: cita.id }}
          >
            Pagar depósito
          </Link>
        </Button>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <AccionesCita cita={cita} onCambio={onCambio} />

      <div className="mt-3 border-t border-border pt-3">
        {!confirmando ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setConfirmando(true)}
          >
            <XCircle className="size-4" /> Cancelar cita
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              {!pagada
                ? "La reserva se libera y no se cobra nada."
                : conReembolso
                  ? `Faltan más de ${HORAS_REEMBOLSO} horas: se te devolverá el depósito de ${soles(Number(cita.deposito_requerido))}.`
                  : `Faltan menos de ${HORAS_REEMBOLSO} horas: el depósito de ${soles(Number(cita.deposito_requerido))} no se devuelve.`}{" "}
              ¿Seguro que quieres cancelar?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full"
                disabled={enviando}
                onClick={cancelar}
              >
                {enviando && <Loader2 className="size-4 animate-spin" />} Sí, cancelar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={enviando}
                onClick={() => setConfirmando(false)}
              >
                No, mantenerla
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Calificar({ pendiente, onListo }: { pendiente: CitaPorResenar; onListo: () => void }) {
  const [estrellas, setEstrellas] = React.useState(0);
  const [comentario, setComentario] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [enviado, setEnviado] = React.useState(false);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await resenasApi.calificar(pendiente.cita_id, estrellas, comentario);
      setEnviado(true);
      window.setTimeout(onListo, 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar tu reseña.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="font-semibold">{pendiente.servicio}</p>
      <p className="text-sm text-muted-foreground">
        con {pendiente.odontologo} · {fechaLarga(fechaDe(pendiente.atendida_el))}
      </p>
      {enviado ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" /> ¡Gracias por tu reseña!
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={estrellas === n}
                aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                onClick={() => setEstrellas(n)}
                className="rounded p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "size-6",
                    n <= estrellas ? "fill-warning text-warning" : "text-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={1000}
            placeholder="Cuéntanos cómo te atendieron (opcional)"
            className="mt-3"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button
            size="sm"
            className="mt-3 rounded-full"
            disabled={estrellas === 0 || enviando}
            onClick={enviar}
          >
            {enviando && <Loader2 className="size-4 animate-spin" />} Enviar reseña
          </Button>
        </>
      )}
    </div>
  );
}

function Medidor({
  label,
  valor,
  max,
  color,
}: {
  label: string;
  valor: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {valor}/{max}
        </span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-6 flex-1 rounded-md",
              i < valor ? color : "border border-border/50 bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

const primeraMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
