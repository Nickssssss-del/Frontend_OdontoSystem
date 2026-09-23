import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DentistCard } from "@/components/DentistCard";
import { VerificacionCOP } from "@/components/VerificacionCOP";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { busyBlocks, dentists, timeBlocks } from "@/lib/mock-data";
import { useAppState } from "@/lib/app-state";

export const Route = createFileRoute("/odontologo/configuracion")({
  head: () => ({ meta: [{ title: "Configuración del odontólogo | OdontoSystem" }] }),
  component: ConfiguracionOdontologo,
});

function ConfiguracionOdontologo() {
  const { documentos, setDocumentos, frecuenciaDisponibilidad, setFrecuenciaDisponibilidad, bloqueoExpressActivo, setBloqueoExpressActivo, confirmacionManual, setConfirmacionManual } = useAppState();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const dentist = dentists.find((item) => item.id === "d1")!;
  const ocupacion = Math.round(((busyBlocks.d1?.length ?? 0) / timeBlocks.length) * 100);
  const requestBlock = (checked: boolean) => checked ? setDialogOpen(true) : setBloqueoExpressActivo(false);

  return <AppShell>
    <div className="space-y-6">
      <header><p className="flex items-center gap-2 text-sm text-primary"><ShieldCheck className="size-4" /> Preferencias del consultorio</p><h1 className="font-display text-3xl font-semibold">Configuración</h1><p className="mt-1 text-sm text-muted-foreground">Administra tu documentación COP, disponibilidad y reglas de agenda desde un solo lugar.</p></header>
      <VerificacionCOP documentos={documentos} onChange={setDocumentos} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 font-display text-xl"><CalendarClock className="size-5 text-primary" /> Disponibilidad</CardTitle><p className="text-sm text-muted-foreground">Define con qué frecuencia actualizas tus bloques.</p></CardHeader><CardContent><ToggleGroup type="single" value={frecuenciaDisponibilidad} onValueChange={(value) => value && setFrecuenciaDisponibilidad(value)} className="grid gap-2 sm:grid-cols-2"><ToggleGroupItem value="Actualizo mi disponibilidad diariamente" className="h-auto justify-start p-4 text-left">Diariamente</ToggleGroupItem><ToggleGroupItem value="Actualizo semanalmente" className="h-auto justify-start p-4 text-left">Semanalmente</ToggleGroupItem></ToggleGroup><p className="mt-3 text-xs text-muted-foreground">{frecuenciaDisponibilidad}</p></CardContent></Card>
        <Card className={bloqueoExpressActivo ? "border-destructive/50" : undefined}><CardHeader><CardTitle className="flex items-center gap-2 font-display text-xl"><AlertTriangle className="size-5 text-warning" /> Bloqueo Express</CardTitle><p className="text-sm text-muted-foreground">Pausa la agenda de hoy cuando ocurre una emergencia.</p></CardHeader><CardContent className="space-y-4"><SettingRow label="Activar bloqueo express de mi agenda" description="Requiere confirmación porque afecta los turnos de hoy." checked={bloqueoExpressActivo} onCheckedChange={requestBlock} prominent /><SettingRow label="Requerir mi confirmación manual antes de bloquear la agenda" description="Las solicitudes quedarán pendientes hasta que las revises." checked={confirmacionManual} onCheckedChange={setConfirmacionManual} /></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 font-display text-xl"><UserRound className="size-5 text-primary" /> Perfil público</CardTitle><p className="text-sm text-muted-foreground">Vista previa de lo que verán los pacientes en el catálogo.</p></CardHeader><CardContent className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]"><DentistCard dentist={dentist} /><div className="rounded-2xl border border-border bg-background p-5"><p className="text-sm font-semibold">Resumen visible</p><div className="mt-4 flex flex-wrap gap-2">{dentist.specialties.map((item) => <span key={item} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{item}</span>)}</div><p className="mt-5 text-sm font-semibold">Servicios publicados</p><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{dentist.services.map((service) => <li key={service.name} className="flex justify-between gap-4"><span>{service.name}</span><span className="font-medium text-foreground">S/ {service.price}</span></li>)}</ul><div className="mt-5 border-t border-border pt-4"><div className="flex justify-between text-sm"><span>Ocupación de agenda</span><strong className="text-primary">{ocupacion}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${ocupacion}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{busyBlocks.d1?.length ?? 0} de {timeBlocks.length} bloques ocupados</p></div></div></CardContent></Card>
    </div>
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Activar bloqueo express?</AlertDialogTitle><AlertDialogDescription>Esto cancelará/pausará los turnos de hoy por emergencia y dejará de ofrecer nuevos cupos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continuar con la agenda</AlertDialogCancel><AlertDialogAction onClick={() => { setBloqueoExpressActivo(true); toast.warning("Bloqueo express activado"); }}>Activar bloqueo</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}

function SettingRow({ label, description, checked, onCheckedChange, prominent = false }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void; prominent?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${prominent ? "border-warning/40 bg-warning/10" : "border-border"}`}><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} /></div>;
}
