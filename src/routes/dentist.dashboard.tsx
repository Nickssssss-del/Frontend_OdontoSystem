import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  Users,
  BarChart3,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState, statusLabel } from "@/lib/app-state";
import { fechaLima } from "@/lib/odontologos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Panel de control del odontólogo: KPIs, ingresos, ocupación y agenda.",
      },
      { property: "og:title", content: "Dashboard | OdontoSystem Odontólogo" },
    ],
  }),
  component: DentistDashboard,
});

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Lunes (YYYY-MM-DD) de la semana de una fecha YYYY-MM-DD, calculado en UTC para no correr el día. */
function lunesDe(fecha: string, offsetSemanas = 0): Date {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow + offsetSemanas * 7);
  return d;
}
const aClave = (d: Date) => d.toISOString().slice(0, 10);

type KPI = {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" };
  color: "primary" | "accent" | "success" | "destructive";
};

function DentistDashboard() {
  const { agenda, appointments, usuario } = useAppState();

  // KPIs con las citas reales del backend (/api/odontologos/yo/citas).
  const hoy = fechaLima(0);
  const citasHoy = agenda
    .filter((a) => a.date === hoy)
    .sort((x, y) => x.time.localeCompare(y.time));
  const totalIngresos = citasHoy
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + a.amount, 0);
  const pacientesCitados = new Set(citasHoy.map((a) => a.patientId ?? a.patient)).size;
  const proximas = agenda.filter(
    (a) => a.date >= hoy && a.status !== "CANCELLED" && a.status !== "NO_SHOW",
  ).length;
  const porConfirmar = agenda.filter((a) => a.status === "VERIFYING").length;

  const lunes = lunesDe(hoy);
  const ingresoSemanalData = DIAS_SEMANA.map((day, i) => {
    const fecha = new Date(lunes);
    fecha.setUTCDate(lunes.getUTCDate() + i);
    const clave = aClave(fecha);
    return {
      day,
      ingresos: appointments
        .filter((a) => a.date === clave && a.status === "COMPLETED")
        .reduce((sum, a) => sum + a.amount, 0),
    };
  });
  const citasPorSemanaData = [-1, 0, 1, 2, 3].map((offset) => {
    const desde = aClave(lunesDe(hoy, offset));
    const hasta = aClave(lunesDe(hoy, offset + 1));
    return {
      week: offset === 0 ? "Esta semana" : offset < 0 ? "Anterior" : `+${offset} sem`,
      citas: agenda.filter(
        (a) =>
          a.date >= desde && a.date < hasta && a.status !== "CANCELLED" && a.status !== "NO_SHOW",
      ).length,
    };
  });

  const kpis: KPI[] = [
    {
      id: "ingresos",
      label: "Ingresos hoy",
      value: `S/ ${totalIngresos}`,
      icon: <DollarSign className="size-5" />,
      color: "success",
    },
    {
      id: "pacientes",
      label: "Pacientes hoy",
      value: pacientesCitados,
      icon: <Users className="size-5" />,
      color: "primary",
    },
    {
      id: "ocupacion",
      label: "Citas próximas",
      value: proximas,
      icon: <BarChart3 className="size-5" />,
      color: "accent",
    },
    {
      id: "strikes",
      label: "Por confirmar",
      value: porConfirmar,
      icon: <AlertCircle className="size-5" />,
      color: porConfirmar > 0 ? "destructive" : "primary",
    },
  ];

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido/a, {usuario?.nombre ?? "odontólogo"}</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.label}</p>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    </div>
                    <div
                      className={cn(
                        "p-2 rounded-lg",
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

        {/* Gráficos */}
        <div className="grid gap-6 mb-8 lg:grid-cols-2">
          {/* Ingresos Semanales */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-success" />
                  Ingresos Semanales
                </CardTitle>
                <CardDescription>Citas atendidas esta semana, en soles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ingresoSemanalData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--muted-foreground-opacity-20)"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                      }}
                      formatter={(value) => `S/ ${value}`}
                    />
                    <Bar dataKey="ingresos" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ocupación Mensual */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Citas por semana
                </CardTitle>
                <CardDescription>Citas activas (no canceladas) por semana</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={citasPorSemanaData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--muted-foreground-opacity-20)"
                    />
                    <XAxis
                      dataKey="week"
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      style={{ fontSize: "12px" }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                      }}
                      formatter={(value) => `${value} cita(s)`}
                    />
                    <Line
                      type="monotone"
                      dataKey="citas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Agenda de Hoy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5 text-accent" />
                Agenda Hoy
              </CardTitle>
              <CardDescription>Citas programadas para hoy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {citasHoy.slice(0, 8).map((apt) => (
                      <TableRow key={apt.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-sm">{apt.time}</TableCell>
                        <TableCell className="text-sm">{apt.patient}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {apt.service}
                        </TableCell>
                        <TableCell className="text-sm font-medium">S/ {apt.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              apt.status === "COMPLETED" &&
                                "bg-success/10 text-success border-success/30",
                              apt.status === "CONFIRMED" &&
                                "bg-primary/10 text-primary border-primary/30",
                              apt.status === "VERIFYING" &&
                                "bg-warning/10 text-warning border-warning/30",
                            )}
                          >
                            {statusLabel[apt.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
