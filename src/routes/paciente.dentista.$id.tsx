import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarClock, Lock, MapPin, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  busyBlocks,
  diaCorto,
  getDentist,
  mesCorto,
  nextDays,
  soles,
  timeBlocks,
} from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/dentista/$id")({
  loader: ({ params }) => {
    const dentist = getDentist(params.id);
    if (!dentist) throw notFound();
    return { dentist };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.dentist.name ?? "Odontólogo";
    const desc = `Perfil de ${name} en OdontoSystem: colegiatura COP verificada, servicios, precios en soles y horarios disponibles en Ica.`;
    return {
      meta: [
        { title: `${name} | OdontoSystem Ica` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} | OdontoSystem Ica` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: PerfilDentista,
});

const reseñas = [
  { autor: "Marco A.", puntaje: 5, texto: "Puntual y explica cada paso del tratamiento." },
  { autor: "Lucía T.", puntaje: 5, texto: "El consultorio es impecable y la atención rapidísima." },
  { autor: "Jorge B.", puntaje: 4, texto: "Buen trato, la sala de espera se llena a mediodía." },
];

function PerfilDentista() {
  const { dentist } = Route.useLoaderData();
  const { isBanned } = useAppState();

  const days = React.useMemo(() => nextDays(7), []);
  const [dayIndex, setDayIndex] = React.useState(0);
  const [hora, setHora] = React.useState<string | null>(null);

  const busy = busyBlocks[dentist.id] ?? [];
  const selectedDay = days[dayIndex]!;
  const fechaISO = selectedDay.toISOString().slice(0, 10);
  const fechaLarga = `${diaCorto[selectedDay.getDay()]} ${selectedDay.getDate()} ${
    mesCorto[selectedDay.getMonth()]
  }`;

  return (
    <AppShell>
      <Link
        to="/paciente/catalogo"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al catálogo
      </Link>

      {/* Cabecera del perfil */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
      >
        <Card className="mt-4 overflow-hidden rounded-3xl border-emerald-100 shadow-sm transition-all hover:shadow-md">
          <div className={cn("flex h-36 items-center justify-center bg-gradient-to-br", dentist.tint)}>
            <span className="flex size-20 items-center justify-center rounded-full bg-white/80 font-display text-3xl font-semibold text-foreground/80 shadow-sm">
              {dentist.initials}
            </span>
          </div>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{dentist.name}</h1>
              {dentist.verified ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="size-3.5" /> COP Verificado ✓
                </span>
              ) : (
                <span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                  En Revisión
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {dentist.specialty} · Colegiatura {dentist.cop}
            </p>
            <p className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-semibold">
                <Star className="size-4 fill-warning text-warning" /> {dentist.rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({dentist.reviews} reseñas)
                </span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4" /> {dentist.district}
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                desde {soles(dentist.price)}
              </span>
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{dentist.bio}</p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Horarios disponibles */}
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CalendarClock className="size-5 text-primary" /> Horarios disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {days.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDayIndex(i);
                      setHora(null);
                    }}
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 text-sm transition-colors",
                      i === dayIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="text-[11px] uppercase">{diaCorto[d.getDay()]}</span>
                    <span className="font-display text-lg font-semibold">{d.getDate()}</span>
                    <span className="text-[11px]">{mesCorto[d.getMonth()]}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {timeBlocks.map((t, i) => {
                  const disabled = busy.includes(t);
                  return (
                    <motion.button
                      key={t}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i }}
                      whileTap={{ scale: disabled ? 1 : 0.94 }}
                      disabled={disabled}
                      onClick={() => setHora(t)}
                      className={cn(
                        "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                        disabled
                          ? "cursor-not-allowed border-dashed border-border bg-muted/60 text-muted-foreground/60 line-through"
                          : t === hora
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/60",
                      )}
                    >
                      {t}
                    </motion.button>
                  );
                })}
              </div>

              {isBanned ? (
                <div className="mt-6 space-y-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
                  <Button disabled className="w-full rounded-full">
                    <Lock className="size-4" /> Reservar cita y pagar
                  </Button>
                  <p className="text-center text-xs font-semibold text-destructive">
                    Cuenta suspendida temporalmente por inasistencias
                  </p>
                </div>
              ) : (
                <Button
                  asChild={!!hora}
                  disabled={!hora}
                  className="mt-6 w-full rounded-full"
                  size="lg"
                >
                  {hora ? (
                    <Link
                      to="/paciente/agendar/$id"
                      params={{ id: dentist.id }}
                      search={{ fecha: fechaISO, hora }}
                    >
                      Reservar cita y pagar · {fechaLarga} {hora}
                    </Link>
                  ) : (
                    <span>Selecciona un horario para reservar</span>
                  )}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                El cupo se aparta 10 minutos mientras completas el pago de garantía.
              </p>
            </CardContent>
          </Card>

          {/* Reseñas */}
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Reseñas verificadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reseñas.map((r, i) => (
                <motion.div
                  key={r.autor}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {r.autor}
                    <span className="flex">
                      {Array.from({ length: r.puntaje }, (_, k) => (
                        <Star key={k} className="size-3.5 fill-warning text-warning" />
                      ))}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Servicios */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Servicios y precios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dentist.services.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-sm"
                  >
                    <span>{s.name}</span>
                    <span className="font-semibold text-primary">{soles(s.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-primary/8 p-3 text-xs text-muted-foreground">
                La reserva requiere un pago de garantía del 20% (mínimo {soles(20)}), descontable
                de tu tratamiento.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
