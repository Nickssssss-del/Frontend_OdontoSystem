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
  const { agenda } = useAppState();
  const [viewMode, setViewMode] = React.useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = React.useState(new Date(2026, 8, 15)); // Sept 15

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

  // Horas disponibles
  const hours = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // View: Day
  const DayView = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {hours.map((hour) => {
          const appointment = agenda.find((a) => a.time === hour);
          return (
            <motion.div
              key={hour}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-lg border border-border/70 p-3 transition-all hover:shadow-md",
                appointment ? statusColors[appointment.status] : "bg-muted/30"
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground mb-2">{hour}</p>
              {appointment ? (
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{appointment.patient}</p>
                  <p className="text-xs text-muted-foreground">{appointment.service}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-medium">S/ {appointment.amount}</span>
                    <Badge variant="outline" className="h-5 text-xs">
                      {statusLabel[appointment.status]}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Libre</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );

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
            const dayAppointments = agenda.filter(
              (a) => new Date(a.date).toDateString() === date.toDateString()
            );

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "rounded-lg border border-border/70 p-4 min-w-max transition-all",
                  isToday ? "bg-primary/10 border-primary/50" : "bg-muted/30"
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
            const dayAppointments = agenda.filter(
              (a) => new Date(a.date).toDateString() === date.toDateString()
            );
            const isToday = date.toDateString() === currentDate.toDateString();

            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "aspect-square rounded-lg border border-border/70 p-2 flex flex-col text-xs hover:shadow-md transition-shadow",
                  isToday ? "bg-primary/10 border-primary/50" : "bg-muted/30"
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
                { status: "VERIFYING", label: "Verificando pago", icon: AlertCircle },
                { status: "PAYMENT_REJECTED", label: "Pago rechazado", icon: AlertCircle },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", 
                    item.status === "CONFIRMED" && "bg-primary",
                    item.status === "COMPLETED" && "bg-success",
                    item.status === "VERIFYING" && "bg-warning",
                    item.status === "PAYMENT_REJECTED" && "bg-destructive"
                  )} />
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
