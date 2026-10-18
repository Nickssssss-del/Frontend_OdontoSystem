import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  DollarSign,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState, statusLabel } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Agenda interactiva con vistas por día, semana y mes.",
      },
    ],
  }),
  component: DentistAgenda,
});

type ViewMode = "day" | "week" | "month";

function DentistAgenda() {
  const { agenda, citasCargando, confirmarCita } = useAppState();
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  // "YYYY-MM-DD" en hora local, para comparar con Appointment.date (ya viene en hora de Lima).
  // No usar new Date(a.date): "YYYY-MM-DD" se interpreta como UTC y corre el día en Lima/Bogotá.
  const claveDia = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Colores por estado
  const statusColors = {
    CONFIRMED: "bg-primary/12 border-l-4 border-primary text-primary",
    COMPLETED: "bg-success/12 border-l-4 border-success text-success",
    VERIFYING: "bg-warning/12 border-l-4 border-warning text-warning",
    PAYMENT_REJECTED: "bg-destructive/12 border-l-4 border-destructive text-destructive",
    CANCELLED: "bg-muted border-l-4 border-muted-foreground text-muted-foreground",
    PENDING_PAYMENT: "bg-muted/50 border-l-4 border-muted-foreground text-muted-foreground",
    NO_SHOW: "bg-destructive/12 border-l-4 border-destructive text-destructive",
  };

  // View: Day — las citas reales del día, ordenadas por hora (los turnos los define el horario del odontólogo).
  const DayView = () => {
    const delDia = agenda
      .filter((a) => a.date === claveDia(currentDate))
      .sort((x, y) => x.time.localeCompare(y.time));
    if (delDia.length === 0) {
      return (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          {citasCargando ? "Cargando citas…" : "No tienes citas este día."}
        </p>
      );
    }
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {delDia.map((appointment) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg border border-border/70 p-3 transition-all hover:shadow-md",
                statusColors[appointment.status],
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-2">{appointment.time}</p>
              <div className="space-y-1">
                <p className="font-semibold text-sm">{appointment.patient}</p>
                <p className="text-xs text-muted-foreground">{appointment.service}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-medium">S/ {appointment.amount}</span>
                  <Badge variant="outline" className="h-5 text-xs">
                    {statusLabel[appointment.status]}
                  </Badge>
                </div>
                {appointment.status === "VERIFYING" && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => void confirmarCita(appointment.id).catch(() => undefined)}
                  >
                    Confirmar cita
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  // View: Week
  const WeekView = () => {
    const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const semana = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - date.getDay() + 1 + i);
      return date;
    });

    return (
      <div className="overflow-x-auto">
        <div className="inline-flex gap-3 pb-4">
          {dias.map((day, idx) => {
            const date = semana[idx];
            if (!date) return null;
            const isToday = date.toDateString() === currentDate.toDateString();
            const dayAppointments = agenda
              .filter((a) => a.date === claveDia(date))
              .sort((x, y) => x.time.localeCompare(y.time));

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "rounded-lg border border-border/70 p-4 min-w-max transition-all",
                  isToday ? "bg-primary/10 border-primary/50" : "bg-muted/30",
                )}
              >
                <div className="mb-3">
                  <p className="font-semibold text-sm">{day}</p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dayAppointments.length > 0 ? (
                    dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="text-xs rounded p-1.5 bg-background border-l-2 border-primary"
                      >
                        <p className="font-semibold">{apt.time}</p>
                        <p className="text-muted-foreground truncate">{apt.patient}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin citas</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // View: Month
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() || 6;

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startingDayOfWeek - 1 });

    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const date = new Date(year, month, day);
            const dayAppointments = agenda
              .filter((a) => a.date === claveDia(date))
              .sort((x, y) => x.time.localeCompare(y.time));
            const isToday = date.toDateString() === currentDate.toDateString();

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "aspect-square rounded-lg border border-border/70 p-2 flex flex-col text-xs hover:shadow-md transition-shadow",
                  isToday ? "bg-primary/10 border-primary/50" : "bg-muted/30",
                )}
              >
                <p className="font-semibold">{day}</p>
                <div className="flex-1 overflow-hidden">
                  {dayAppointments.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {dayAppointments.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className="rounded px-1 py-0.5 bg-primary/20 text-primary text-xs truncate"
                        >
                          {apt.time}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <p className="text-muted-foreground text-xs">
                          +{dayAppointments.length - 2}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Agenda</h1>
          <p className="text-muted-foreground">
            {currentDate.toLocaleDateString("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Navigation + View Selector */}
        <Card className="mb-8">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Selecciona vista</CardTitle>
              <CardDescription>Día, semana o mes</CardDescription>
            </div>

            <div className="flex items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
                    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
                    else newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium min-w-max">
                  {currentDate.toLocaleDateString("es-PE", { month: "short", year: "numeric" })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
                    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
                    else newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              {/* View Mode Tabs */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="day">Día</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mes</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
        </Card>

        {/* Views */}
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {viewMode === "day" && <DayView />}
          {viewMode === "week" && <WeekView />}
          {viewMode === "month" && <MonthView />}
        </motion.div>

        {/* Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Leyenda de estados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { status: "CONFIRMED", label: "Confirmada", icon: CheckCircle2 },
                { status: "COMPLETED", label: "Completada", icon: CheckCircle2 },
                { status: "VERIFYING", label: "Por confirmar", icon: AlertCircle },
                { status: "NO_SHOW", label: "Inasistencia", icon: AlertCircle },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      item.status === "CONFIRMED" && "bg-primary",
                      item.status === "COMPLETED" && "bg-success",
                      item.status === "VERIFYING" && "bg-warning",
                      item.status === "NO_SHOW" && "bg-destructive",
                    )}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}
