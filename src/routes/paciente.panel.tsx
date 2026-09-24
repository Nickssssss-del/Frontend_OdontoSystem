import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Zap,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

export const Route = createFileRoute("/paciente/panel")({
  head: () => ({
    meta: [
      { title: "Mi Panel | OdontoSystem" },
      {
        name: "description",
        content:
          "Tu panel de paciente: KPIs de salud dental, historial de citas y seguimiento de puntualidad.",
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

type KPI = {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; direction: "up" | "down" };
  color: "primary" | "accent" | "destructive" | "success";
};

function PacientePanel() {
  const { patient, appointments, strikes } = useAppState();

  // Calcular KPIs
  const totalInvested = appointments
    .filter((a) => a.status === "COMPLETED" || a.status === "CONFIRMED")
    .reduce((sum, a) => sum + a.amount, 0);

  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const activeAppointments = appointments.filter((a) => a.status === "CONFIRMED").length;
  const attendanceRate = Math.round((completedCount / Math.max(1, appointments.length)) * 100);

  const kpis: KPI[] = [
    {
      id: "invested",
      label: "Total invertido",
      value: `S/ ${totalInvested}`,
      icon: <DollarSign className="size-5" />,
      color: "primary",
    },
    {
      id: "completed",
      label: "Tratamientos completados",
      value: completedCount,
      icon: <CheckCircle2 className="size-5" />,
      color: "success",
    },
    {
      id: "active",
      label: "Citas activas",
      value: activeAppointments,
      icon: <Calendar className="size-5" />,
      color: "accent",
    },
    {
      id: "attendance",
      label: "Puntualidad",
      value: `${attendanceRate}%`,
      icon: <TrendingUp className="size-5" />,
      color: "primary",
    },
  ];

  // Datos de semáforo de puntualidad
  const punctualityData = [
    { label: "Inasistencias", value: 1, max: 3, color: "bg-destructive" },
    { label: "Cancelaciones", value: 0, max: 3, color: "bg-warning" },
    { label: "Reprogramaciones", value: 2, max: 5, color: "bg-accent" },
  ];

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Welcome Banner */}
        <div className="mb-8 rounded-xl border border-border/70 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
          <h1 className="text-2xl font-semibold mb-2">
            Hola, <span className="text-primary">{patient}</span> 👋
          </h1>
          <p className="text-muted-foreground">Tu salud dental, siempre bajo control.</p>
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
                      <p className="text-xs text-muted-foreground font-medium mb-1">
                        {kpi.label}
                      </p>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      kpi.color === "primary" && "bg-primary/12 text-primary",
                      kpi.color === "accent" && "bg-accent/12 text-accent",
                      kpi.color === "destructive" && "bg-destructive/12 text-destructive",
                      kpi.color === "success" && "bg-success/12 text-success",
                    )}>
                      {kpi.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Punctuality Meter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                Semáforo de Puntualidad
              </CardTitle>
              <CardDescription>
                Control de incumplimientos. Tres strikes = cuenta suspendida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {punctualityData.map((item, idx) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">{item.label}</label>
                      <span className="text-xs text-muted-foreground">
                        {item.value}/{item.max}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {/* Filled blocks */}
                      {Array.from({ length: item.value }).map((_, i) => (
                        <div
                          key={`fill-${i}`}
                          className={cn("h-6 rounded-md flex-1", item.color)}
                        />
                      ))}
                      {/* Empty blocks */}
                      {Array.from({ length: item.max - item.value }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="h-6 rounded-md flex-1 bg-muted border border-border/50"
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Strike Warning */}
                {strikes >= 2 && (
                  <div className="mt-4 rounded-lg border border-warning/50 bg-warning/5 p-3 flex gap-3">
                    <AlertCircle className="size-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-warning">Atención: {strikes} strikes registrados</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Te quedan {3 - strikes} strike(s) antes de la suspensión de cuenta.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Appointment History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                Historial de Citas
              </CardTitle>
              <CardDescription>
                Últimas {appointments.length} citas registradas en tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Odontólogo</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.slice(0, 8).map((apt) => (
                      <TableRow key={apt.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-sm">{apt.patient}</TableCell>
                        <TableCell className="text-sm">{apt.service}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(apt.date).toLocaleDateString("es-PE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          {apt.time}
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
                              apt.status === "NO_SHOW" &&
                                "bg-destructive/10 text-destructive border-destructive/30",
                              apt.status === "CANCELLED" &&
                                "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {apt.status === "COMPLETED"
                              ? "Completada"
                              : apt.status === "CONFIRMED"
                                ? "Confirmada"
                                : apt.status === "NO_SHOW"
                                  ? "Inasistencia"
                                  : "Cancelada"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {appointments.length === 0 && (
                <div className="py-12 text-center">
                  <Calendar className="size-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Aún no tienes citas registradas.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
