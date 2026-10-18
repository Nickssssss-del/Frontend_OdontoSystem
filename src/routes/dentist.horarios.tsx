import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AlertCircle, CalendarOff, Clock, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ApiError, horariosApi, type Bloqueo, type DiaSemana, type Horario } from "@/lib/api";
import { fechaDe, fechaLima, horaDe } from "@/lib/odontologos";

export const Route = createFileRoute("/dentist/horarios")({
  head: () => ({
    meta: [
      { title: "Gestión de Horarios | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Administra tu horario semanal y tus bloqueos de agenda.",
      },
    ],
  }),
  component: DentistHorarios,
});

// Horario semanal y bloqueos reales:
//   GET/PUT /api/odontologos/yo/horarios            (PUT reemplaza TODO el horario semanal)
//   GET/POST/DELETE /api/odontologos/yo/bloqueos    (POST cancela con reembolso las citas del rango)
// Los turnos que ven los pacientes (GET /api/odontologos/{id}/disponibilidad) salen de este horario.

const DIAS: { clave: DiaSemana; etiqueta: string }[] = [
  { clave: "LUNES", etiqueta: "Lunes" },
  { clave: "MARTES", etiqueta: "Martes" },
  { clave: "MIERCOLES", etiqueta: "Miércoles" },
  { clave: "JUEVES", etiqueta: "Jueves" },
  { clave: "VIERNES", etiqueta: "Viernes" },
  { clave: "SABADO", etiqueta: "Sábado" },
  { clave: "DOMINGO", etiqueta: "Domingo" },
];

type Franja = { dia_semana: DiaSemana; hora_inicio: string; hora_fin: string; intervalo: string };

/** "08:00:00" → "08:00" (los <input type="time"> trabajan con HH:mm). */
const hhmm = (hora: string) => hora.slice(0, 5);

const aFranja = (h: Horario): Franja => ({
  dia_semana: h.dia_semana,
  hora_inicio: hhmm(h.hora_inicio),
  hora_fin: hhmm(h.hora_fin),
  intervalo: h.intervalo_minutos ? String(h.intervalo_minutos) : "",
});

const mensajeDe = (e: unknown, defecto = "Ocurrió un error inesperado.") =>
  e instanceof ApiError ? e.message : defecto;

/** Instante ISO (con -05:00, hora de Lima) a partir de fecha y hora locales de Lima. */
const instanteLima = (fecha: string, hora: string) =>
  new Date(`${fecha}T${hora}:00-05:00`).toISOString();

function DentistHorarios() {
  const { blockedToday, setBlockedToday, recargarCitas } = useAppState();
  const [franjas, setFranjas] = React.useState<Franja[]>([]);
  const [bloqueos, setBloqueos] = React.useState<Bloqueo[]>([]);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState(false);
  const [sucio, setSucio] = React.useState(false);

  // Formulario de bloqueo por rango.
  const [bFecha, setBFecha] = React.useState(fechaLima(0));
  const [bInicio, setBInicio] = React.useState("08:00");
  const [bFin, setBFin] = React.useState("20:00");
  const [bMotivo, setBMotivo] = React.useState("");
  const [bloqueando, setBloqueando] = React.useState(false);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [horarios, lista] = await Promise.all([horariosApi.obtener(), horariosApi.bloqueos()]);
      setFranjas(horarios.map(aFranja));
      setBloqueos(lista);
      setSucio(false);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo cargar tu horario."));
    } finally {
      setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  // Cuando el bloqueo de hoy cambia desde el contexto, se refresca la lista.
  React.useEffect(() => {
    void horariosApi
      .bloqueos()
      .then(setBloqueos)
      .catch(() => undefined);
  }, [blockedToday]);

  const cambiar = (indice: number, parche: Partial<Franja>) => {
    setFranjas((prev) => prev.map((f, i) => (i === indice ? { ...f, ...parche } : f)));
    setSucio(true);
  };

  const agregar = (dia: DiaSemana) => {
    setFranjas((prev) => [
      ...prev,
      { dia_semana: dia, hora_inicio: "09:00", hora_fin: "13:00", intervalo: "" },
    ]);
    setSucio(true);
  };

  const quitar = (indice: number) => {
    setFranjas((prev) => prev.filter((_, i) => i !== indice));
    setSucio(true);
  };

  const guardar = async () => {
    if (guardando) return;
    for (const f of franjas) {
      if (!f.hora_inicio || !f.hora_fin || f.hora_fin <= f.hora_inicio) {
        toast.error("Revisa tus horarios", {
          description: "La hora de fin debe ser posterior a la de inicio.",
        });
        return;
      }
    }
    setGuardando(true);
    try {
      const guardado = await horariosApi.guardar(
        franjas.map((f) => ({
          dia_semana: f.dia_semana,
          hora_inicio: f.hora_inicio,
          hora_fin: f.hora_fin,
          intervalo_minutos: f.intervalo ? Number(f.intervalo) : null,
        })),
      );
      setFranjas(guardado.map(aFranja));
      setSucio(false);
      toast.success("Horario guardado", {
        description: "Los pacientes ya ven tus nuevos turnos disponibles.",
      });
    } catch (e) {
      toast.error("No se pudo guardar el horario", { description: mensajeDe(e) });
    } finally {
      setGuardando(false);
    }
  };

  const bloquearRango = async () => {
    if (bloqueando) return;
    if (!bFecha || !bInicio || !bFin || bFin <= bInicio) {
      toast.error("Revisa el bloqueo", {
        description: "La hora de fin debe ser posterior al inicio.",
      });
      return;
    }
    const ok = window.confirm(
      "Las citas ya reservadas dentro de ese rango se cancelan con reembolso del 100 %. ¿Continuar?",
    );
    if (!ok) return;
    setBloqueando(true);
    try {
      const creado = await horariosApi.bloquear(
        instanteLima(bFecha, bInicio),
        instanteLima(bFecha, bFin),
        bMotivo.trim() || undefined,
      );
      setBloqueos((prev) => [...prev, creado].sort((a, b) => a.inicio.localeCompare(b.inicio)));
      setBMotivo("");
      toast.success("Agenda bloqueada", {
        description:
          creado.citas_canceladas > 0
            ? `Se cancelaron ${creado.citas_canceladas} cita(s) con reembolso.`
            : "No había citas en ese rango.",
      });
      void recargarCitas();
    } catch (e) {
      toast.error("No se pudo bloquear la agenda", { description: mensajeDe(e) });
    } finally {
      setBloqueando(false);
    }
  };

  const quitarBloqueo = async (id: string) => {
    try {
      await horariosApi.quitarBloqueo(id);
      setBloqueos((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bloqueo eliminado");
      void recargarCitas();
    } catch (e) {
      toast.error("No se pudo quitar el bloqueo", { description: mensajeDe(e) });
    }
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Gestión de Horarios</h1>
          <p className="text-muted-foreground">
            Define cuándo atiendes. Los pacientes solo pueden reservar dentro de estas franjas.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/40">
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" /> {error}
              </p>
              <Button variant="outline" size="sm" onClick={() => void cargar()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Horario semanal */}
        <Card className="mb-8">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5 text-primary" /> Horario semanal
              </CardTitle>
              <CardDescription>
                Puedes tener varias franjas por día (por ejemplo mañana y tarde). El intervalo es la
                duración de cada turno; si lo dejas vacío se usa la duración del servicio.
              </CardDescription>
            </div>
            <Button onClick={() => void guardar()} disabled={!sucio || guardando}>
              {guardando ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Guardar horario
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {cargando ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando tu horario…
              </p>
            ) : (
              DIAS.map(({ clave, etiqueta }) => {
                const delDia = franjas
                  .map((f, indice) => ({ f, indice }))
                  .filter(({ f }) => f.dia_semana === clave);
                return (
                  <div key={clave} className="rounded-xl border border-border/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold">{etiqueta}</p>
                      <Button variant="ghost" size="sm" onClick={() => agregar(clave)}>
                        <Plus className="mr-1 size-4" /> Agregar franja
                      </Button>
                    </div>
                    {delDia.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No atiendes este día.</p>
                    ) : (
                      <div className="space-y-2">
                        {delDia.map(({ f, indice }) => (
                          <div key={indice} className="flex flex-wrap items-center gap-2">
                            <Input
                              type="time"
                              value={f.hora_inicio}
                              onChange={(e) => cambiar(indice, { hora_inicio: e.target.value })}
                              className="w-32"
                              aria-label={`${etiqueta}: hora de inicio`}
                            />
                            <span className="text-sm text-muted-foreground">a</span>
                            <Input
                              type="time"
                              value={f.hora_fin}
                              onChange={(e) => cambiar(indice, { hora_fin: e.target.value })}
                              className="w-32"
                              aria-label={`${etiqueta}: hora de fin`}
                            />
                            <Input
                              type="number"
                              min={5}
                              max={240}
                              placeholder="Intervalo (min)"
                              value={f.intervalo}
                              onChange={(e) => cambiar(indice, { intervalo: e.target.value })}
                              className="w-40"
                              aria-label={`${etiqueta}: intervalo en minutos`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => quitar(indice)}
                              aria-label="Quitar franja"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Bloqueos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="size-5 text-primary" /> Bloqueos de agenda
            </CardTitle>
            <CardDescription>
              Para imprevistos o vacaciones. Las citas ya reservadas en el rango se cancelan con
              reembolso del 100 % al paciente (máximo 60 días por bloqueo).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={blockedToday ? "destructive" : "outline"}
                onClick={() => setBlockedToday(!blockedToday)}
              >
                <Lock className="mr-2 size-4" />
                {blockedToday ? "Desbloquear hoy" : "Bloquear lo que queda de hoy"}
              </Button>
              {blockedToday && (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  Hoy no se aceptan reservas
                </Badge>
              )}
            </div>

            <div className="grid gap-3 rounded-xl border border-border/70 p-4 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <label className="text-xs font-medium text-muted-foreground">
                Fecha
                <Input
                  type="date"
                  min={fechaLima(0)}
                  value={bFecha}
                  onChange={(e) => setBFecha(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Desde
                <Input type="time" value={bInicio} onChange={(e) => setBInicio(e.target.value)} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Hasta
                <Input type="time" value={bFin} onChange={(e) => setBFin(e.target.value)} />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Motivo (opcional)
                <Input
                  maxLength={150}
                  value={bMotivo}
                  onChange={(e) => setBMotivo(e.target.value)}
                  placeholder="Ej. Capacitación"
                />
              </label>
              <div className="flex items-end">
                <Button onClick={() => void bloquearRango()} disabled={bloqueando}>
                  {bloqueando && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Bloquear
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {bloqueos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes bloqueos vigentes.</p>
              ) : (
                bloqueos.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {fechaDe(b.inicio)} · {horaDe(b.inicio)} – {horaDe(b.fin)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.motivo ?? "Sin motivo"}
                        {b.citas_canceladas > 0 && ` · ${b.citas_canceladas} cita(s) canceladas`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void quitarBloqueo(b.id)}
                      aria-label="Quitar bloqueo"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}
