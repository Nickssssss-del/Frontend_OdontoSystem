/**
 * Gráficos del dashboard del odontólogo (Recharts).
 * Usan los colores del tema mediante variables CSS (`--color-*`), por lo que
 * respetan el modo claro y oscuro. Los datos llegan ya calculados desde el dashboard.
 */
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const soles = (n: number) =>
  `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type PuntoTooltip = { value?: number | string; payload?: Record<string, unknown> };

function TooltipGrafico({
  active,
  payload,
  label,
  formato,
}: {
  active?: boolean;
  payload?: PuntoTooltip[];
  label?: string | number;
  formato: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const valor = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-base font-semibold text-foreground">{formato(valor)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ingresos semanales (barras)                                          */
/* ------------------------------------------------------------------ */

export type IngresoDia = { day: string; ingresos: number };

export function IngresosSemanalesChart({
  data,
  diaActual,
}: {
  data: IngresoDia[];
  /** Etiqueta del día de hoy (p. ej. «Mié») para resaltar su barra. */
  diaActual?: string | undefined;
}) {
  const id = React.useId().replace(/:/g, "");
  const total = data.reduce((s, d) => s + d.ingresos, 0);
  const mejor = data.reduce<IngresoDia | null>(
    (m, d) => (d.ingresos > (m?.ingresos ?? 0) ? d : m),
    null,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-success/12 text-success">
                <TrendingUp className="size-4" />
              </span>
              Ingresos semanales
            </CardTitle>
            <CardDescription className="mt-1">
              Citas atendidas esta semana, en soles
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold leading-none text-foreground">
              {soles(total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mejor ? `Mejor día: ${mejor.day}` : "Sin ingresos aún"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={`${id}-barra`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id={`${id}-suave`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="var(--color-border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v: number) => (v === 0 ? "0" : `S/${v}`)}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.6, radius: 10 }}
                content={<TooltipGrafico formato={soles} />}
              />
              <Bar
                dataKey="ingresos"
                radius={[10, 10, 4, 4]}
                maxBarSize={44}
                background={{ fill: "var(--color-muted)", fillOpacity: 0.45, radius: 10 }}
                animationDuration={900}
              >
                {data.map((d) => (
                  <Cell
                    key={d.day}
                    fill={
                      d.day === diaActual || !diaActual ? `url(#${id}-barra)` : `url(#${id}-suave)`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {total === 0 && (
          <p className="-mt-1 text-center text-xs text-muted-foreground">
            Cuando atiendas citas esta semana, aparecerán aquí.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Citas por semana (área con puntos)                                   */
/* ------------------------------------------------------------------ */

export type CitasSemana = { week: string; citas: number };

type PropsPunto = {
  cx?: number | undefined;
  cy?: number | undefined;
  payload?: CitasSemana | undefined;
  esActual: string;
};

function PuntoCitas({ cx, cy, payload, esActual }: PropsPunto) {
  if (cx == null || cy == null) return null;
  const actual = payload?.week === esActual;
  return (
    <g>
      {actual && <circle cx={cx} cy={cy} r={11} fill="var(--color-primary)" fillOpacity={0.15} />}
      <circle
        cx={cx}
        cy={cy}
        r={actual ? 6 : 4.5}
        fill={actual ? "var(--color-primary)" : "var(--color-card)"}
        stroke="var(--color-primary)"
        strokeWidth={2.5}
      />
    </g>
  );
}

export function CitasPorSemanaChart({ data }: { data: CitasSemana[] }) {
  const id = React.useId().replace(/:/g, "");
  const total = data.reduce((s, d) => s + d.citas, 0);
  const tope = Math.max(2, ...data.map((d) => d.citas));
  const etiquetaActual = "Esta semana";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarRange className="size-4" />
              </span>
              Citas por semana
            </CardTitle>
            <CardDescription className="mt-1">
              Citas activas (no canceladas) por semana
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-semibold leading-none text-foreground">
              {total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">en el periodo</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 16, right: 16, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" stroke="var(--color-border)" />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, tope + 1]}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--color-primary)",
                  strokeOpacity: 0.3,
                  strokeDasharray: "4 4",
                }}
                content={<TooltipGrafico formato={(n) => `${n} ${n === 1 ? "cita" : "citas"}`} />}
              />
              <Area
                type="monotone"
                dataKey="citas"
                stroke="var(--color-primary)"
                strokeWidth={3}
                strokeLinecap="round"
                fill={`url(#${id}-area)`}
                dot={(p: { cx?: number; cy?: number; payload?: CitasSemana; index?: number }) => (
                  <PuntoCitas
                    key={`${p.index ?? p.payload?.week}`}
                    cx={p.cx}
                    cy={p.cy}
                    payload={p.payload}
                    esActual={etiquetaActual}
                  />
                )}
                activeDot={{
                  r: 7,
                  strokeWidth: 3,
                  stroke: "var(--color-card)",
                  fill: "var(--color-primary)",
                }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
