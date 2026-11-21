import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Search, Eye, MoreHorizontal, Mail, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { pacientesApi, type PacienteResumen } from "@/lib/api";
import { fechaLima } from "@/lib/odontologos";
import { agruparPacientesPorId, idPacienteConsultable } from "@/lib/historias-clinicas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { detalleDeError } from "@/components/perfil/perfilUtils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dentist/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes | OdontoSystem Odont\u00f3logo" },
      {
        name: "description",
        content: "Administra el registro de tus pacientes y visualiza su historial.",
      },
    ],
  }),
  component: DentistPacientes,
});

type Patient = {
  id: string;
  /** Identificador real para GET historias. null: no se consulta. */
  idConsulta: string | null;
  name: string;
  age: number | null;
  phone: string;
  email: string;
  lastVisit: string | null;
  specialty: string;
  status: "active" | "inactive";
  appointmentsCount: number;
};

function resumenAPaciente(p: PacienteResumen): Patient {
  const idConsulta = idPacienteConsultable(p.id);
  return {
    id: idConsulta ?? p.id,
    idConsulta,
    name: p.nombre_completo,
    age: null,
    phone: p.telefono ?? "",
    email: p.correo ?? "",
    lastVisit: p.ultima_atencion,
    specialty: "",
    status: p.proxima_cita != null || p.citas_atendidas > 0 ? "active" : "inactive",
    appointmentsCount: p.total_citas,
  };
}

function fechaLista(valor: string | null): string {
  if (!valor) return "\u2014";
  const fecha = valor.includes("T") ? new Date(valor) : new Date(`${valor}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return "\u2014";
  return fecha.toLocaleDateString("es-PE", { day: "numeric", month: "short" });
}

function DentistPacientes() {
  const { agenda, appointments } = useAppState();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [desdeApi, setDesdeApi] = React.useState<Patient[] | null>(null);
  const [listaIncompleta, setListaIncompleta] = React.useState(false);
  const [cargandoLista, setCargandoLista] = React.useState(true);
  // Motivo real del fallo (antes se descartaba y no se podía diagnosticar: DISP02-O06).
  const [motivoLista, setMotivoLista] = React.useState<string | null>(null);
  const [intentoLista, setIntentoLista] = React.useState(0);

  React.useEffect(() => {
    let vivo = true;
    setCargandoLista(true);
    pacientesApi
      .mios()
      .then((lista) => {
        if (!vivo) return;
        setDesdeApi(lista.map(resumenAPaciente));
        setListaIncompleta(false);
        setMotivoLista(null);
      })
      .catch((err: unknown) => {
        if (!vivo) return;
        setDesdeApi(null);
        setListaIncompleta(true);
        setMotivoLista(detalleDeError(err, "Error desconocido"));
      })
      .finally(() => {
        if (vivo) setCargandoLista(false);
      });
    return () => {
      vivo = false;
    };
  }, [intentoLista]);

  const desdeAgenda = React.useMemo(() => {
    const hoy = fechaLima(0);
    const { porId, sinIdentificador } = agruparPacientesPorId([...agenda, ...appointments]);
    const pacientes = [...porId.entries()].map(([id, citas]) => {
      const unicas = citas.filter(
        (cita, indice) => citas.findIndex((otra) => otra.id === cita.id) === indice,
      );
      const ordenadas = [...unicas].sort((x, y) =>
        `${y.date}${y.time}`.localeCompare(`${x.date}${x.time}`),
      );
      const ultima = ordenadas[0]!;
      const vigentes = unicas.filter((c) => c.status !== "CANCELLED" && c.status !== "NO_SHOW");
      const ultimaAtendida = ordenadas.find((c) => c.status === "COMPLETED");
      return {
        id,
        idConsulta: id,
        name: ultima.patient || "Paciente",
        age: null,
        phone: ultima.patientPhone ?? "",
        email: ultima.patientEmail ?? "",
        lastVisit: (ultimaAtendida ?? ultima).date,
        specialty: ultima.service,
        status: vigentes.some((c) => c.date >= hoy || c.status === "COMPLETED")
          ? ("active" as const)
          : ("inactive" as const),
        appointmentsCount: vigentes.length,
      };
    });
    return { pacientes, sinIdentificador };
  }, [agenda, appointments]);

  // Servicio de la \u00faltima cita de cada paciente (desc por fecha+hora).
  const ultimoServicioPorPaciente = React.useMemo<Map<string, string>>(() => {
    const mapa = new Map<string, string>();
    const porPaciente = new Map<string, { key: string; service: string }[]>();
    for (const cita of [...agenda, ...appointments]) {
      const id = idPacienteConsultable(cita.patientId);
      if (!id) continue;
      const lista = porPaciente.get(id) ?? [];
      lista.push({ key: `${cita.date}${cita.time}`, service: cita.service });
      porPaciente.set(id, lista);
    }
    for (const [id, citas] of porPaciente.entries()) {
      const ordenadas = [...citas].sort((x, y) => y.key.localeCompare(x.key));
      if (ordenadas[0]) mapa.set(id, ordenadas[0].service);
    }
    return mapa;
  }, [agenda, appointments]);

  // Combina la lista de la API con el servicio de la \u00faltima cita (sin mutar estado).
  const desdeApiConServicio = React.useMemo<Patient[] | null>(
    () =>
      desdeApi?.map((p) => ({
        ...p,
        specialty: ultimoServicioPorPaciente.get(p.id) ?? p.specialty,
      })) ?? null,
    [desdeApi, ultimoServicioPorPaciente],
  );

  const patients = desdeApiConServicio ?? (listaIncompleta ? desdeAgenda.pacientes : []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const hayEdad = patients.some((p) => p.age != null);
  const columnas = hayEdad ? 7 : 6;

  const stats = {
    total: patients.length,
    active: patients.filter((p) => p.status === "active").length,
    inactive: patients.filter((p) => p.status === "inactive").length,
  };

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona tu cartera de pacientes</p>
          {listaIncompleta && desdeAgenda.sinIdentificador > 0 && (
            <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
              {desdeAgenda.sinIdentificador === 1
                ? "Hay 1 cita sin el identificador del paciente."
                : `Hay ${desdeAgenda.sinIdentificador} citas sin el identificador del paciente.`}{" "}
              No se consulta su historial: el respaldo de la agenda no usa el nombre como
              paciente_id. Limitación: sin ese id no se puede abrir la historia clínica.
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 mb-8 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total de pacientes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Pacientes activos</p>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                  <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Buscar pacientes</CardTitle>
              <CardDescription>Filtra por nombre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: Nicole, Marco..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patients Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Registro de Pacientes</CardTitle>
              <CardDescription>
                {cargandoLista
                  ? "Cargando pacientes\u2026"
                  : `${filteredPatients.length} paciente(s) encontrado(s).`}
                {listaIncompleta &&
                  ` No se pudo cargar el listado completo (${motivoLista ?? "sin detalle"}): esta lista sale de la agenda y puede estar incompleta.`}
              </CardDescription>
              {listaIncompleta && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-fit rounded-full"
                  onClick={() => setIntentoLista((n) => n + 1)}
                  disabled={cargandoLista}
                >
                  Reintentar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 md:hidden" aria-label="Pacientes">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <li key={patient.id} className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{patient.name}</p>
                          {patient.email && (
                            <p className="truncate text-xs text-muted-foreground">
                              {patient.email}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0",
                            patient.status === "active"
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {patient.status === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Última cita</dt>
                          <dd>{fechaLista(patient.lastVisit)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Citas</dt>
                          <dd className="font-medium">{patient.appointmentsCount}</dd>
                        </div>
                        {hayEdad && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Edad</dt>
                            <dd>{patient.age ?? "\u2014"}</dd>
                          </div>
                        )}
                        {patient.specialty && (
                          <div>
                            <dt className="text-xs text-muted-foreground">Especialidad</dt>
                            <dd>{patient.specialty}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {patient.idConsulta ? (
                          <Button asChild size="sm" className="min-h-10 flex-1 rounded-xl">
                            <Link
                              to="/dentist/historial/$pacienteId"
                              params={{ pacienteId: patient.idConsulta }}
                            >
                              <Eye className="size-4" />
                              Ver historial
                            </Link>
                          </Button>
                        ) : (
                          <p className="flex-1 text-xs text-muted-foreground">
                            Historial no disponible: falta el identificador
                          </p>
                        )}
                        {patient.email && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="size-10 rounded-xl p-0"
                          >
                            <a
                              href={`mailto:${patient.email}`}
                              aria-label={`Escribir a ${patient.name}`}
                            >
                              <Mail className="size-4" />
                            </a>
                          </Button>
                        )}
                        {patient.phone && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="size-10 rounded-xl p-0"
                          >
                            <a
                              href={`tel:${patient.phone}`}
                              aria-label={`Llamar a ${patient.name}`}
                            >
                              <Phone className="size-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-8 text-center text-muted-foreground">
                    No se encontraron pacientes
                  </li>
                )}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      {hayEdad && <TableHead>Edad</TableHead>}
                      <TableHead className="hidden md:table-cell">\u00daltima cita</TableHead>
                      <TableHead className="hidden lg:table-cell">Especialidad</TableHead>
                      <TableHead>Citas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <TableRow key={patient.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-semibold">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">{patient.email}</p>
                            </div>
                          </TableCell>
                          {hayEdad && (
                            <TableCell className="text-sm">{patient.age ?? "\u2014"}</TableCell>
                          )}
                          <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                            {fechaLista(patient.lastVisit)}
                          </TableCell>
                          <TableCell className="text-sm hidden lg:table-cell">
                            {patient.specialty || "\u2014"}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {patient.appointmentsCount}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                patient.status === "active"
                                  ? "bg-success/10 text-success border-success/30"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {patient.status === "active" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  aria-label={`Acciones de ${patient.name}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {patient.idConsulta ? (
                                  <DropdownMenuItem asChild>
                                    <Link
                                      to="/dentist/historial/$pacienteId"
                                      params={{ pacienteId: patient.idConsulta }}
                                    >
                                      <Eye className="size-4 mr-2" />
                                      Ver historial clínico
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    Historial no disponible: falta el identificador
                                  </DropdownMenuItem>
                                )}
                                {patient.email && (
                                  <DropdownMenuItem asChild>
                                    <a href={`mailto:${patient.email}`}>
                                      <Mail className="size-4 mr-2" />
                                      Enviar email
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                {patient.phone && (
                                  <DropdownMenuItem asChild>
                                    <a href={`tel:${patient.phone}`}>
                                      <Phone className="size-4 mr-2" />
                                      Llamar
                                    </a>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columnas}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No se encontraron pacientes
                        </TableCell>
                      </TableRow>
                    )}
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
