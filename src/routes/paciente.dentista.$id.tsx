import * as React from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarClock, Lock, MapPin, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { soles } from "@/lib/mock-data";
import { ApiError, odontologosApi, type ResenasOdontologo } from "@/lib/api";
import { fechaDe, horaDe, iniciales, partesDia } from "@/lib/odontologos";
import { SelectorTurnos } from "@/components/SelectorTurnos";
import { MapaConsultorio } from "@/components/MapaConsultorio";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente/dentista/$id")({
  loader: async ({ params }) => {
    try {
      const [perfil, resenas] = await Promise.all([
        odontologosApi.perfil(params.id),
        odontologosApi.resenas(params.id).catch((): ResenasOdontologo | null => null),
      ]);
      return { perfil, resenas };
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) throw notFound();
      throw e;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.perfil.nombre ?? "Odontólogo";
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

function PerfilDentista() {
  const { perfil, resenas } = Route.useLoaderData();
  const { isBanned } = useAppState();

  const servicios = perfil.servicios.filter((s) => s.activo);
  const [servicioId, setServicioId] = React.useState(servicios[0]?.id ?? "");
  const [inicio, setInicio] = React.useState<string | null>(null);

  const servicio = servicios.find((s) => s.id === servicioId);
  const precioDesde = servicios.length
    ? Math.min(...servicios.map((s) => Number(s.precio_total)))
    : 0;
  const calificacion = Number(perfil.calificacion ?? 0);

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
        <Card className="mt-4 overflow-hidden rounded-3xl border-mint/60 shadow-sm transition-all hover:shadow-md">
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/25 to-accent/40">
            {perfil.foto_url ? (
              <img
                src={perfil.foto_url}
                alt={`Foto de ${perfil.nombre}`}
                className="size-24 rounded-full border-4 border-white/80 object-cover shadow-sm"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-white/80 font-display text-3xl font-semibold text-foreground/80 shadow-sm">
                {iniciales(perfil.nombre)}
              </span>
            )}
          </div>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold">{perfil.nombre}</h1>
              {perfil.colegiatura_verificada ? (
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
              {perfil.especialidades.map((e) => e.nombre).join(" · ") || "Odontología general"}
              {perfil.numero_colegiatura ? ` · Colegiatura ${perfil.numero_colegiatura}` : ""}
            </p>
            <p className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-semibold">
                <Star className="size-4 fill-warning text-warning" />
                {calificacion > 0 ? calificacion.toFixed(1) : "Nuevo"}
                <span className="font-normal text-muted-foreground">
                  ({perfil.total_resenas ?? 0} reseñas)
                </span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-4" /> {perfil.distrito ?? "Ica"}
              </span>
              {precioDesde > 0 && (
                <span className="flex items-center gap-1 font-semibold text-primary">
                  desde {soles(precioDesde)}
                </span>
              )}
            </p>
            {(perfil.consultorio || perfil.direccion) && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {[perfil.consultorio, perfil.direccion].filter(Boolean).join(" · ")}
              </p>
            )}
            {perfil.fotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-2">
                {perfil.fotos.map((f) => (
                  <img
                    key={f.id}
                    src={f.url}
                    alt={f.descripcion ?? "Foto del consultorio"}
                    loading="lazy"
                    className="h-24 w-36 shrink-0 rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Horarios disponibles */}
          <Card className="rounded-3xl border-mint/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <CalendarClock className="size-5 text-primary" /> Horarios disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {servicios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este odontólogo todavía no publicó servicios.
                </p>
              ) : (
                <>
                  <SelectorTurnos
                    odontologoId={perfil.id}
                    servicios={servicios}
                    servicioId={servicioId}
                    onServicio={setServicioId}
                    inicio={inicio}
                    onInicio={setInicio}
                  />

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
                      asChild={!!inicio}
                      disabled={!inicio}
                      className="mt-6 w-full rounded-full"
                      size="lg"
                    >
                      {inicio ? (
                        <Link
                          to="/paciente/agendar/$id"
                          params={{ id: perfil.id }}
                          search={{ servicio: servicioId, inicio }}
                        >
                          Reservar {servicio?.titulo ?? "cita"} · {partesDia(fechaDe(inicio)).dia}{" "}
                          {partesDia(fechaDe(inicio)).numero} {horaDe(inicio)}
                        </Link>
                      ) : (
                        <span>Selecciona un horario para reservar</span>
                      )}
                    </Button>
                  )}
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Al reservar, el turno queda apartado 15 minutos mientras pagas el depósito.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reseñas reales */}
          <Card className="rounded-3xl border-mint/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Reseñas verificadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!resenas || resenas.resenas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no tiene reseñas. Solo pueden calificar los pacientes que ya fueron atendidos.
                </p>
              ) : (
                resenas.resenas.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {r.paciente}
                      <span className="flex">
                        {Array.from({ length: r.calificacion }, (_, k) => (
                          <Star key={k} className="size-3.5 fill-warning text-warning" />
                        ))}
                      </span>
                    </p>
                    {r.comentario && (
                      <p className="mt-1 text-sm text-muted-foreground">{r.comentario}</p>
                    )}
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Servicios y Ubicación */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <Card className="rounded-3xl border-mint/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Servicios y precios</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {servicios.map((s) => (
                  <li key={s.id} className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>{s.titulo}</span>
                      <span className="font-semibold text-primary">
                        {soles(Number(s.precio_total))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.duracion_minutos} min · depósito {soles(Number(s.monto_deposito))}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-primary/8 p-3 text-xs text-muted-foreground">
                Para reservar pagas un depósito que se descuenta del total en tu consulta.
                {perfil.requiere_confirmacion_manual
                  ? " Este odontólogo confirma cada cita después del pago."
                  : " La cita se confirma apenas se verifica el pago."}
              </p>
            </CardContent>
          </Card>

          {/* Ubicación y mapa del consultorio */}
          <Card className="rounded-3xl border-mint/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <MapPin className="size-5 text-primary" /> Ubicación del consultorio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MapaConsultorio
                latitud={perfil.latitud}
                longitud={perfil.longitud}
                nombreConsultorio={perfil.consultorio}
                direccion={perfil.direccion}
                distrito={perfil.distrito}
                altura={230}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
