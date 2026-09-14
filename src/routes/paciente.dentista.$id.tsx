import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, Lock, MapPin, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDentist, soles } from "@/lib/mock-data";
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

  return (
    <AppShell>
      <Link
        to="/paciente/catalogo"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al catálogo
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr]"
      >
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className={cn("flex h-40 items-center justify-center bg-gradient-to-br", dentist.tint)}>
              <span className="font-display text-4xl font-semibold text-foreground/80">
                {dentist.initials}
              </span>
            </div>
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold">{dentist.name}</h1>
                {dentist.verified ? (
                  <span className="flex items-center gap-1 rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                    <BadgeCheck className="size-3.5" /> Colegiado Verificado ✓
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
              <p className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 font-semibold">
                  <Star className="size-4 fill-warning text-warning" /> {dentist.rating.toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({dentist.reviews} reseñas)
                  </span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-4" /> {dentist.district}
                </span>
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{dentist.bio}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Reseñas verificadas</h2>
            <div className="mt-4 space-y-3">
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
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Servicios</h2>
            <ul className="mt-3 space-y-2">
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

            {isBanned ? (
              <div className="mt-5 space-y-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-muted py-3 text-sm font-semibold text-muted-foreground"
                >
                  <Lock className="size-4" /> Reservar cita
                </button>
                <p className="text-center text-xs font-semibold text-destructive">
                  Cuenta suspendida temporalmente por inasistencias
                </p>
              </div>
            ) : (
              <Link
                to="/paciente/agendar/$id"
                params={{ id: dentist.id }}
                className="mt-5 block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                Reservar cita · anticipo {soles(20)}
              </Link>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              El cupo se aparta 10 minutos mientras realizas tu Yape o Plin.
            </p>
          </div>
        </aside>
      </motion.div>
    </AppShell>
  );
}
