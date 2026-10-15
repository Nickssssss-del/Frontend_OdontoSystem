import * as React from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { ApiError, odontologosApi, type ServicioOdontologo, type Turno } from "@/lib/api";
import { soles } from "@/lib/mock-data";
import { fechaDe, horaDe, partesDia, proximosDias } from "@/lib/odontologos";
import { cn } from "@/lib/utils";

/**
 * Servicio + día + turno libre, con los turnos reales de GET /api/odontologos/{id}/disponibilidad.
 * `inicio` es el valor exacto del turno (ISO con zona), que es lo que pide POST /api/citas.
 */
export function SelectorTurnos({
  odontologoId,
  servicios,
  servicioId,
  onServicio,
  inicio,
  onInicio,
  recargar = 0,
}: {
  odontologoId: string;
  servicios: ServicioOdontologo[];
  servicioId: string;
  onServicio: (id: string) => void;
  inicio: string | null;
  onInicio: (inicio: string | null) => void;
  /** Cambiar este número vuelve a pedir los turnos (por ejemplo, si otro paciente tomó el turno). */
  recargar?: number;
}) {
  const dias = React.useMemo(() => proximosDias(7), []);
  const [fecha, setFecha] = React.useState(() => {
    const preseleccionada = inicio ? fechaDe(inicio) : null;
    return preseleccionada && dias.includes(preseleccionada) ? preseleccionada : dias[0]!;
  });
  const [turnos, setTurnos] = React.useState<Turno[]>([]);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!servicioId) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    odontologosApi
      .disponibilidad(odontologoId, servicioId, fecha)
      .then((d) => {
        if (!vigente) return;
        setTurnos(d.turnos);
        // Si el turno elegido ya no está libre, se quita la selección
        if (inicio && !d.turnos.some((t) => t.inicio === inicio) && fechaDe(inicio) === fecha)
          onInicio(null);
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setTurnos([]);
        setError(e instanceof ApiError ? e.message : "No se pudieron cargar los horarios.");
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odontologoId, servicioId, fecha, recargar]);

  return (
    <div>
      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-medium text-muted-foreground">Servicio</span>
        <select
          value={servicioId}
          onChange={(e) => {
            onServicio(e.target.value);
            onInicio(null);
          }}
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.titulo} · {soles(Number(s.precio_total))} · {s.duracion_minutos} min
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => {
          const p = partesDia(d);
          return (
            <button
              key={d}
              onClick={() => {
                setFecha(d);
                onInicio(null);
              }}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 text-sm transition-colors",
                d === fecha
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50",
              )}
            >
              <span className="text-[11px] uppercase">{p.dia}</span>
              <span className="font-display text-lg font-semibold">{p.numero}</span>
              <span className="text-[11px]">{p.mes}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-24">
        {cargando ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Buscando turnos libres…
          </p>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">{error}</p>
        ) : turnos.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No hay turnos libres este día. Prueba con otra fecha.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {turnos.map((t, i) => (
              <motion.button
                key={t.inicio}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.015 * i }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onInicio(t.inicio)}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  t.inicio === inicio
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/60",
                )}
              >
                {horaDe(t.inicio)}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
