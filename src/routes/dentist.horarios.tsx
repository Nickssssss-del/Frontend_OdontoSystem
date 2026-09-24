import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock, Lock, RotateCcw, Save, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/horarios")({
  head: () => ({
    meta: [
      { title: "Gestión de Horarios | OdontoSystem Odontólogo" },
      {
        name: "description",
        content: "Administra tu disponibilidad de horarios por día y hora.",
      },
    ],
  }),
  component: DentistHorarios,
});

type BlockStatus = "libre" | "cita" | "bloqueado";

interface HourBlock {
  hour: string;
  status: BlockStatus;
  patient?: string;
}

interface DaySchedule {
  day: string;
  blocks: HourBlock[];
}

function DentistHorarios() {
  const { blockedToday, setBlockedToday } = useAppState();
  const [schedules, setSchedules] = React.useState<DaySchedule[]>([
    {
      day: "Lunes",
      blocks: generateBlocks(["08:00", "09:00", "10:00", "14:00", "cita", "16:00", "17:00"]),
    },
    {
      day: "Martes",
      blocks: generateBlocks(["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00"]),
    },
    {
      day: "Miércoles",
      blocks: generateBlocks(["08:00", "09:00", "cita", "cita", "14:00", "15:00", "16:00"]),
    },
    {
      day: "Jueves",
      blocks: generateBlocks(["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]),
    },
    {
      day: "Viernes",
      blocks: generateBlocks(["08:00", "09:00", "10:00", "bloqueado", "14:00", "15:00", "16:00"]),
    },
    {
      day: "Sábado",
      blocks: generateBlocks(["09:00", "10:00", "11:00", "bloqueado", "bloqueado", "14:00", "15:00"]),
    },
  ]);

  function generateBlocks(config: string[]): HourBlock[] {
    return [
      { hour: "08:00", status: (config.includes("08:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "09:00", status: (config.includes("09:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "10:00", status: (config.includes("10:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "11:00", status: (config.includes("11:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "12:00", status: (config.includes("12:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "14:00", status: (config.includes("14:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "15:00", status: (config.includes("15:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "16:00", status: (config.includes("16:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
      { hour: "17:00", status: (config.includes("17:00") ? "libre" : config.includes("cita") ? "cita" : "bloqueado") as BlockStatus },
    ];
  }

  const toggleBlockStatus = (dayIdx: number, blockIdx: number) => {
    setSchedules((prev) => {
      const updated = [...prev];
      const block = updated[dayIdx]!.blocks[blockIdx]!;
      
      if (block.status === "libre") {
        block.status = "bloqueado";
      } else if (block.status === "bloqueado") {
        block.status = "libre";
      }
      
      return updated;
    });
  };

  const handleBlockToday = () => {
    setBlockedToday(!blockedToday);
    toast.success(
      blockedToday ? "Disponibilidad restaurada" : "Agenda bloqueada para hoy",
      { description: blockedToday ? "Tus pacientes pueden agendar nuevamente." : "No se aceptarán citas hoy." }
    );
  };

  const handleSave = () => {
    toast.success("Horarios guardados", {
      description: "Tu disponibilidad ha sido actualizada.",
    });
  };

  const handleReset = () => {
    setSchedules([
      {
        day: "Lunes",
        blocks: generateBlocks(["08:00", "09:00", "10:00", "14:00", "cita", "16:00", "17:00"]),
      },
      {
        day: "Martes",
        blocks: generateBlocks(["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00"]),
      },
      {
        day: "Miércoles",
        blocks: generateBlocks(["08:00", "09:00", "cita", "cita", "14:00", "15:00", "16:00"]),
      },
      {
        day: "Jueves",
        blocks: generateBlocks(["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]),
      },
      {
        day: "Viernes",
        blocks: generateBlocks(["08:00", "09:00", "10:00", "bloqueado", "14:00", "15:00", "16:00"]),
      },
      {
        day: "Sábado",
        blocks: generateBlocks(["09:00", "10:00", "11:00", "bloqueado", "bloqueado", "14:00", "15:00"]),
      },
    ]);
    toast.info("Horarios reiniciados");
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Gestión de Horarios</h1>
          <p className="text-muted-foreground">Administra tu disponibilidad de citas</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Block Today */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardContent className="pt-6">
                <Button
                  onClick={handleBlockToday}
                  variant={blockedToday ? "destructive" : "outline"}
                  className="w-full"
                >
                  <Lock className="size-4 mr-2" />
                  {blockedToday ? "Desbloquear hoy" : "Bloquear agenda hoy"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Horarios libres</p>
                  <p className="text-2xl font-bold">
                    {schedules.reduce((sum, day) => sum + day.blocks.filter(b => b.status === "libre").length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">de {schedules.length * 9} totales</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* With Appointments */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bloqueados</p>
                  <p className="text-2xl font-bold">
                    {schedules.reduce((sum, day) => sum + day.blocks.filter(b => b.status === "bloqueado").length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Cambiar para disponibilidad</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Schedule Grid */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Horarios de la Semana</CardTitle>
            <CardDescription>
              Haz clic en un bloque para cambiar entre Libre y Bloqueado (No puedes modificar citas existentes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {schedules.map((day, dayIdx) => (
                <motion.div
                  key={day.day}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIdx * 0.1 }}
                >
                  <div>
                    <h3 className="font-semibold mb-3">{day.day}</h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
                      {day.blocks.map((block, blockIdx) => (
                        <motion.button
                          key={`${day.day}-${block.hour}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (block.status !== "cita") {
                              toggleBlockStatus(dayIdx, blockIdx);
                            }
                          }}
                          disabled={block.status === "cita"}
                          className={cn(
                            "p-2 rounded-lg text-xs font-medium transition-all border cursor-pointer",
                            block.status === "libre" &&
                              "bg-success/10 text-success border-success/30 hover:bg-success/20",
                            block.status === "bloqueado" &&
                              "bg-muted text-muted-foreground border-border hover:bg-muted/70",
                            block.status === "cita" &&
                              "bg-primary/20 text-primary border-primary/30 cursor-not-allowed opacity-70"
                          )}
                        >
                          <div className="font-semibold">{block.hour}</div>
                          <div className="text-xs">
                            {block.status === "libre" ? "✓" : block.status === "cita" ? "📅" : "🔒"}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-border/70">
              <p className="text-sm font-semibold mb-3">Leyenda</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-success/10 border border-success/30" />
                  <span className="text-sm">Libre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-muted border border-border" />
                  <span className="text-sm">Bloqueado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30" />
                  <span className="text-sm">Cita (no modificable)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            Restaurar valores
          </Button>
          <Button
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="size-4" />
            Guardar disponibilidad
          </Button>
        </div>

        {/* Info */}
        {blockedToday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-lg border border-warning/50 bg-warning/5 p-3 flex gap-3"
          >
            <AlertCircle className="size-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Agenda bloqueada para hoy</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus pacientes no podrán agendar citas por hoy.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
